'use strict';
(function (S) {
  const SIGUIENTE = { abierto: 'en_preparacion', en_preparacion: 'listo', listo: 'entregado' };
  const NOMBRE_ESTADO = {
    abierto: 'Tomando pedido', en_preparacion: 'En cocina', listo: 'Listo para servir',
    entregado: 'En la mesa', pagado: 'Pagado', cancelado: 'Cancelado'
  };
  const ACCION = { abierto: 'Enviar a cocina', en_preparacion: 'Marcar listo', listo: 'Marcar entregado' };
  const ACTIVOS = ['abierto', 'en_preparacion', 'listo', 'entregado'];
  const MINUTOS_DEMORA = 20;
  const MAX_CANTIDAD = 20;

  const falla = (mensaje) => ({ ok: false, errores: [mensaje] });
  const bien = (extra) => Object.assign({ ok: true, errores: [] }, extra);

  function totales(pedido, impoconsumo) {
    const total = pedido.items.reduce((suma, i) => suma + (i.recompensa ? 0 : i.precio * i.cantidad), 0);
    const impuesto = Math.round(total - total / (1 + impoconsumo));
    return { base: total - impuesto, impuesto, total };
  }

  function minutosEnEstado(pedido) {
    const ultimo = pedido.historial[pedido.historial.length - 1];
    return Math.floor((S.ahora() - ultimo.fecha) / 60000);
  }

  function cambiarEstado(pedido, estado, usuarioId) {
    pedido.estado = estado;
    pedido.historial.push({ estado, fecha: S.ahora(), usuarioId });
  }

  function modificar(pedidoId, cambio) {
    const usuario = S.seguridad.exigir('pedidos.gestionar');
    return S.datos.guardar((e) => {
      const pedido = e.pedidos.find((p) => p.id === pedidoId);
      if (!pedido) return falla('El pedido no existe.');
      return cambio(pedido, e, usuario);
    });
  }

  S.pedidos = {
    SIGUIENTE, NOMBRE_ESTADO, ACCION, ACTIVOS, MINUTOS_DEMORA, totales, minutosEnEstado, cambiarEstado,

    estaDemorado: (pedido) => pedido.estado === 'en_preparacion' && minutosEnEstado(pedido) >= MINUTOS_DEMORA,

    activos: (estado) => estado.pedidos.filter((p) => ACTIVOS.includes(p.estado)),

    abrir(mesaId) {
      const usuario = S.seguridad.exigir('pedidos.gestionar');
      return S.datos.guardar((e) => {
        if (!e.mesas.some((m) => m.id === mesaId)) return falla('Elige una mesa.');
        if (e.pedidos.some((p) => p.mesaId === mesaId && ACTIVOS.includes(p.estado))) return falla('Esa mesa ya tiene un pedido sin pagar.');
        const pedido = {
          id: S.nuevoId('ped'), numero: e.pedidos.length + 1, mesaId, meseroId: usuario.id, clienteId: null,
          items: [], estado: 'abierto', creado: S.ahora(),
          historial: [{ estado: 'abierto', fecha: S.ahora(), usuarioId: usuario.id }]
        };
        e.pedidos.push(pedido);
        return bien({ pedido });
      });
    },

    agregarPlato(pedidoId, platoId, cantidad) {
      const n = Number(cantidad);
      if (!Number.isInteger(n) || n < 1 || n > MAX_CANTIDAD) return falla('La cantidad debe estar entre 1 y ' + MAX_CANTIDAD + '.');
      return modificar(pedidoId, (pedido, e) => {
        if (pedido.estado !== 'abierto') return falla('El pedido ya se envió a cocina. Abre uno nuevo o pide a cocina el cambio.');
        const plato = e.platos.find((p) => p.id === platoId);
        if (!plato) return falla('Ese plato ya no está en la carta.');
        if (!plato.disponible) return falla(plato.nombre + ' está agotado.');
        const existente = pedido.items.find((i) => i.platoId === platoId && !i.recompensa);
        if (existente) {
          if (existente.cantidad + n > MAX_CANTIDAD) return falla('Máximo ' + MAX_CANTIDAD + ' unidades del mismo plato por pedido.');
          existente.cantidad += n;
        } else {
          pedido.items.push({ platoId, nombre: plato.nombre, precio: plato.precio, cantidad: n, recompensa: false });
        }
        return bien();
      });
    },

    quitarItem(pedidoId, indice) {
      return modificar(pedidoId, (pedido) => {
        if (pedido.estado !== 'abierto') return falla('El pedido ya se envió a cocina.');
        if (!pedido.items[indice]) return falla('Ese renglón no existe.');
        pedido.items.splice(indice, 1);
        return bien();
      });
    },

    asignarCliente(pedidoId, telefono) {
      const tel = String(telefono || '').trim();
      return modificar(pedidoId, (pedido, e) => {
        if (!ACTIVOS.includes(pedido.estado)) return falla('El pedido ya está cerrado.');
        if (!tel) {
          if (pedido.items.some((i) => i.recompensa)) return falla('Quita primero el postre de regalo del pedido.');
          pedido.clienteId = null;
          return bien();
        }
        const cliente = e.usuarios.find((u) => u.rol === 'cliente' && u.activo && u.telefono === tel);
        if (!cliente) return falla('No hay un cliente registrado con el teléfono ' + tel + '.');
        pedido.clienteId = cliente.id;
        return bien({ cliente });
      });
    },

    avanzar(pedidoId) {
      const r = modificar(pedidoId, (pedido, e, usuario) => {
        const siguiente = SIGUIENTE[pedido.estado];
        if (!siguiente) return falla('Este pedido no tiene un paso siguiente aquí.');
        if (pedido.estado === 'abierto' && !pedido.items.length) return falla('Agrega al menos un plato antes de enviar a cocina.');
        cambiarEstado(pedido, siguiente, usuario.id);
        return bien({ pedido });
      });
      if (r.ok) S.seguridad.registrar('pedido.' + r.pedido.estado, 'Pedido ' + r.pedido.numero);
      return r;
    },

    cancelar(pedidoId, motivo) {
      const texto = String(motivo || '').trim();
      if (texto.length < 5 || texto.length > 120) return falla('Escribe el motivo de la cancelación (entre 5 y 120 caracteres).');
      const r = modificar(pedidoId, (pedido, e, usuario) => {
        if (!['abierto', 'en_preparacion', 'listo'].includes(pedido.estado)) return falla('Un pedido entregado o pagado no se puede cancelar.');
        pedido.motivoCancelacion = texto;
        cambiarEstado(pedido, 'cancelado', usuario.id);
        return bien({ pedido });
      });
      if (r.ok) S.seguridad.registrar('pedido.cancelado', 'Pedido ' + r.pedido.numero + ': ' + texto);
      return r;
    }
  };
})(window.SIGR);
