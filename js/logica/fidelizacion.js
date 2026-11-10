'use strict';
(function (S) {
  const SELLOS = 10;
  const falla = (mensaje) => ({ ok: false, errores: [mensaje] });

  function estadoCliente(estado, clienteId) {
    const config = estado.config.fidelizacion;
    const propios = estado.pedidos.filter((p) => p.clienteId === clienteId);
    const consumo = propios.filter((p) => p.estado === 'pagado').reduce((s, p) => s + p.pago.total, 0);
    const usadas = propios.filter((p) => p.estado !== 'cancelado')
      .reduce((s, p) => s + p.items.filter((i) => i.recompensa).reduce((n, i) => n + i.cantidad, 0), 0);
    const ganadas = Math.floor(consumo / config.umbral);
    const avance = consumo % config.umbral;
    return {
      consumo, ganadas, usadas, avance,
      disponibles: Math.max(0, ganadas - usadas),
      falta: config.umbral - avance,
      sellos: Math.floor((avance / config.umbral) * SELLOS),
      umbral: config.umbral
    };
  }

  function validarConfig(datos, estado) {
    const errores = [];
    const umbral = Number(datos.umbral);
    if (!Number.isInteger(umbral) || umbral < 50000 || umbral > 2000000 || umbral % 1000 !== 0) {
      errores.push('El consumo para ganar el regalo debe estar entre $50.000 y $2.000.000, en miles exactos.');
    }
    if (!estado.platos.some((p) => p.id === datos.platoRecompensaId)) errores.push('Elige el plato que se regala.');
    return errores;
  }

  S.fidelizacion = {
    SELLOS, estadoCliente, validarConfig,

    platoRegalo: (estado) => estado.platos.find((p) => p.id === estado.config.fidelizacion.platoRecompensaId) || null,

    clientes(estado) {
      return estado.usuarios.filter((u) => u.rol === 'cliente' && u.activo)
        .map((u) => Object.assign({ cliente: u }, estadoCliente(estado, u.id)))
        .sort((a, b) => b.consumo - a.consumo || a.cliente.nombre.localeCompare(b.cliente.nombre, 'es'));
    },

    historial(estado, clienteId) {
      return estado.pedidos.filter((p) => p.clienteId === clienteId && p.estado === 'pagado')
        .sort((a, b) => b.pago.fecha - a.pago.fecha)
        .map((p) => ({ fecha: p.pago.fecha, total: p.pago.total, regalo: p.items.some((i) => i.recompensa) }));
    },

    canjear(pedidoId) {
      S.seguridad.exigir('fidelizacion.gestionar');
      const r = S.datos.guardar((e) => {
        const pedido = e.pedidos.find((p) => p.id === pedidoId);
        if (!e.config.fidelizacion.activa) return falla('El programa de clientes frecuentes está pausado.');
        if (!pedido) return falla('El pedido no existe.');
        if (!pedido.clienteId) return falla('Asocia primero el pedido a un cliente.');
        if (pedido.estado !== 'abierto') return falla('El regalo se agrega antes de enviar el pedido a cocina.');
        if (pedido.items.some((i) => i.recompensa)) return falla('Este pedido ya tiene un postre de regalo.');
        if (estadoCliente(e, pedido.clienteId).disponibles < 1) return falla('El cliente no tiene regalos disponibles.');
        const plato = e.platos.find((p) => p.id === e.config.fidelizacion.platoRecompensaId);
        if (!plato || !plato.disponible) return falla('El postre de regalo está agotado hoy. Se puede canjear en otra visita.');
        pedido.items.push({ platoId: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad: 1, recompensa: true });
        return { ok: true, errores: [], pedido, plato };
      });
      if (r.ok) S.seguridad.registrar('fidelizacion.canje', 'Pedido ' + r.pedido.numero + ': ' + r.plato.nombre);
      return r;
    },

    configurar(datos) {
      S.seguridad.exigir('fidelizacion.configurar');
      const errores = validarConfig(datos, S.datos.leer());
      if (errores.length) return { ok: false, errores };
      S.datos.guardar((e) => {
        e.config.fidelizacion = { activa: !!datos.activa, umbral: Number(datos.umbral), platoRecompensaId: datos.platoRecompensaId };
      });
      S.seguridad.registrar('fidelizacion.configurada', 'umbral ' + datos.umbral + ', ' + (datos.activa ? 'activa' : 'pausada'));
      return { ok: true, errores: [] };
    }
  };
})(window.SIGR);
