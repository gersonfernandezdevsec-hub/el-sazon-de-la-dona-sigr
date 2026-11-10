'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Pedidos';
  const leer = (id) => S.datos.leer().pedidos.find((p) => p.id === id);

  S.pedidoDePrueba = function (mesaId) {
    const { pedido } = S.pedidos.abrir(mesaId || 'mesa-3');
    S.pedidos.agregarPlato(pedido.id, 'cat-2-p2', 1);
    S.pedidos.agregarPlato(pedido.id, 'cat-3-p1', 2);
    return pedido.id;
  };

  prueba(M, 'Calcula el total y desglosa el impuesto al consumo', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    const t = S.pedidos.totales(leer(id), 0.08);
    igual(t.total, 52000);
    igual(t.impuesto, 3852);
    igual(t.base + t.impuesto, t.total);
  });

  prueba(M, 'Agregar dos veces el mismo plato suma la cantidad', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    S.pedidos.agregarPlato(id, 'cat-3-p1', 1);
    igual(leer(id).items.length, 2);
    igual(leer(id).items[1].cantidad, 3);
  });

  prueba(M, 'Una mesa no puede tener dos pedidos activos', async () => {
    await S.comoMesero();
    S.pedidoDePrueba('mesa-1');
    igual(S.pedidos.abrir('mesa-1').ok, false);
    igual(S.pedidos.abrir('mesa-2').ok, true);
  });

  prueba(M, 'Rechaza platos agotados y cantidades fuera de rango', async () => {
    await S.comoAdmin();
    S.carta.cambiarDisponibilidad('cat-2-p1', false);
    const { pedido } = S.pedidos.abrir('mesa-1');
    igual(S.pedidos.agregarPlato(pedido.id, 'cat-2-p1', 1).ok, false);
    igual(S.pedidos.agregarPlato(pedido.id, 'cat-2-p2', 0).ok, false);
    igual(S.pedidos.agregarPlato(pedido.id, 'cat-2-p2', 21).ok, false);
    igual(S.pedidos.agregarPlato(pedido.id, 'cat-2-p2', 1.5).ok, false);
  });

  prueba(M, 'Un pedido vacío no se envía a cocina', async () => {
    await S.comoMesero();
    const { pedido } = S.pedidos.abrir('mesa-1');
    igual(S.pedidos.avanzar(pedido.id).ok, false);
    igual(leer(pedido.id).estado, 'abierto');
  });

  prueba(M, 'Recorre los estados en orden y guarda el historial', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    ['en_preparacion', 'listo', 'entregado'].forEach((esperado) => {
      igual(S.pedidos.avanzar(id).ok, true);
      igual(leer(id).estado, esperado);
    });
    igual(S.pedidos.avanzar(id).ok, false, 'después de entregado sigue la caja');
    igual(leer(id).historial.length, 4);
  });

  prueba(M, 'Después de enviar a cocina no se cambian los platos', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    S.pedidos.avanzar(id);
    igual(S.pedidos.agregarPlato(id, 'cat-1-p1', 1).ok, false);
    igual(S.pedidos.quitarItem(id, 0).ok, false);
  });

  prueba(M, 'El pedido conserva el precio aunque la carta cambie', async () => {
    await S.comoAdmin();
    const id = S.pedidoDePrueba();
    S.carta.guardarPlato({ nombre: 'Sancocho trifásico', descripcion: '', precio: 45000, categoriaId: 'cat-2' }, 'cat-2-p2');
    igual(S.pedidos.totales(leer(id), 0.08).total, 52000);
  });

  prueba(M, 'Cancelar exige motivo y no aplica a pedidos entregados', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    igual(S.pedidos.cancelar(id, '').ok, false);
    igual(S.pedidos.cancelar(id, 'El cliente se retiró').ok, true);
    igual(leer(id).estado, 'cancelado');
    const otro = S.pedidoDePrueba('mesa-4');
    S.pedidos.avanzar(otro); S.pedidos.avanzar(otro); S.pedidos.avanzar(otro);
    igual(S.pedidos.cancelar(otro, 'Ya no lo quieren').ok, false);
  });

  prueba(M, 'Marca como demorado un pedido con 20 minutos en cocina', async () => {
    const reloj = S.fijarReloj('2026-11-10T13:00:00');
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    S.pedidos.avanzar(id);
    reloj.avanzar(19 * 60000);
    igual(S.pedidos.estaDemorado(leer(id)), false);
    reloj.avanzar(60000);
    igual(S.pedidos.estaDemorado(leer(id)), true);
  });

  prueba(M, 'Asocia el pedido a un cliente por teléfono', async () => {
    await S.comoMesero();
    const id = S.pedidoDePrueba();
    igual(S.pedidos.asignarCliente(id, '3000000000').ok, false);
    igual(S.pedidos.asignarCliente(id, '3005550101').ok, true);
    afirmar(leer(id).clienteId, 'debe quedar el cliente');
  });

  prueba(M, 'Un cliente no puede abrir ni modificar pedidos', async () => {
    await S.comoCliente();
    let bloqueado = false;
    try { S.pedidos.abrir('mesa-1'); } catch (e) { bloqueado = true; }
    afirmar(bloqueado);
  });
})(window.SIGR);
