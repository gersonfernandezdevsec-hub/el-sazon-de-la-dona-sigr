'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Fidelización';
  const TEL = '3005550101';
  const cliente = () => S.datos.leer().usuarios.find((u) => u.usuario === 'cliente');
  const saldo = () => S.fidelizacion.estadoCliente(S.datos.leer(), cliente().id);

  function visita(cabros, mesaId) {
    const { pedido } = S.pedidos.abrir(mesaId || 'mesa-3');
    S.pedidos.agregarPlato(pedido.id, 'cat-2-p1', cabros);
    S.pedidos.asignarCliente(pedido.id, TEL);
    S.pedidos.avanzar(pedido.id); S.pedidos.avanzar(pedido.id); S.pedidos.avanzar(pedido.id);
    S.caja.cobrar(pedido.id, 'tarjeta');
    return pedido.id;
  }

  function pedidoAbierto(mesaId) {
    const { pedido } = S.pedidos.abrir(mesaId || 'mesa-4');
    S.pedidos.agregarPlato(pedido.id, 'cat-3-p1', 1);
    S.pedidos.asignarCliente(pedido.id, TEL);
    return pedido.id;
  }

  prueba(M, 'El consumo solo suma cuando el pedido se paga', async () => {
    await S.comoMesero();
    const { pedido } = S.pedidos.abrir('mesa-3');
    S.pedidos.agregarPlato(pedido.id, 'cat-2-p1', 2);
    S.pedidos.asignarCliente(pedido.id, TEL);
    igual(saldo().consumo, 0);
    S.pedidos.avanzar(pedido.id); S.pedidos.avanzar(pedido.id); S.pedidos.avanzar(pedido.id);
    S.caja.cobrar(pedido.id, 'tarjeta');
    igual(saldo().consumo, 92000);
    igual(saldo().falta, 108000);
    igual(saldo().sellos, 4);
  });

  prueba(M, 'Al completar $200.000 gana un regalo y el avance vuelve a empezar', async () => {
    await S.comoMesero();
    visita(4);
    igual(saldo().disponibles, 0);
    visita(1);
    igual(saldo().ganadas, 1);
    igual(saldo().disponibles, 1);
    igual(saldo().avance, 30000);
  });

  prueba(M, 'Un consumo grande puede dar varios regalos', async () => {
    await S.comoMesero();
    visita(9);
    igual(saldo().disponibles, 2);
  });

  prueba(M, 'Canjear agrega el postre en $0 y descuenta el regalo', async () => {
    await S.comoMesero();
    visita(5);
    const id = pedidoAbierto();
    const r = S.fidelizacion.canjear(id);
    igual(r.ok, true);
    const pedido = S.datos.leer().pedidos.find((p) => p.id === id);
    igual(S.pedidos.totales(pedido, 0.08).total, 7000, 'solo se cobra la limonada');
    igual(saldo().disponibles, 0);
  });

  prueba(M, 'No canjea sin regalos, sin cliente, dos veces o fuera de tiempo', async () => {
    await S.comoMesero();
    const sinSaldo = pedidoAbierto('mesa-1');
    igual(S.fidelizacion.canjear(sinSaldo).ok, false, 'sin regalos');
    visita(9, 'mesa-3');
    const anonimo = S.pedidos.abrir('mesa-2').pedido.id;
    igual(S.fidelizacion.canjear(anonimo).ok, false, 'sin cliente');
    igual(S.fidelizacion.canjear(sinSaldo).ok, true);
    igual(S.fidelizacion.canjear(sinSaldo).ok, false, 'uno por pedido');
    const enCocina = pedidoAbierto('mesa-5');
    S.pedidos.avanzar(enCocina);
    igual(S.fidelizacion.canjear(enCocina).ok, false, 'ya en cocina');
  });

  prueba(M, 'Si el pedido con regalo se cancela, el regalo vuelve al cliente', async () => {
    await S.comoMesero();
    visita(5);
    const id = pedidoAbierto();
    S.fidelizacion.canjear(id);
    igual(saldo().disponibles, 0);
    S.pedidos.cancelar(id, 'El cliente cambió de idea');
    igual(saldo().disponibles, 1);
  });

  prueba(M, 'El regalo no suma consumo ni aparece como venta', async () => {
    await S.comoMesero();
    visita(5);
    const id = pedidoAbierto();
    S.fidelizacion.canjear(id);
    S.pedidos.avanzar(id); S.pedidos.avanzar(id); S.pedidos.avanzar(id);
    S.caja.cobrar(id, 'tarjeta');
    igual(saldo().consumo, 237000);
    const resumen = S.caja.resumenDia(S.datos.leer(), '2026-11-10');
    igual(resumen.regalos, 1);
    igual(resumen.masVendidos.some((v) => v.nombre === 'Oblea con arequipe'), false);
  });

  prueba(M, 'No se quita el cliente de un pedido que ya tiene regalo', async () => {
    await S.comoMesero();
    visita(5);
    const id = pedidoAbierto();
    S.fidelizacion.canjear(id);
    igual(S.pedidos.asignarCliente(id, '').ok, false);
  });

  prueba(M, 'Con el postre agotado o el programa pausado no se canjea', async () => {
    await S.comoAdmin();
    visita(5);
    const id = pedidoAbierto();
    S.carta.cambiarDisponibilidad('cat-4-p1', false);
    igual(S.fidelizacion.canjear(id).ok, false);
    S.carta.cambiarDisponibilidad('cat-4-p1', true);
    S.fidelizacion.configurar({ activa: false, umbral: 200000, platoRecompensaId: 'cat-4-p1' });
    igual(S.fidelizacion.canjear(id).ok, false);
  });

  prueba(M, 'Solo administración configura el programa y con valores válidos', async () => {
    await S.comoMesero();
    let bloqueado = false;
    try { S.fidelizacion.configurar({ activa: true, umbral: 100000, platoRecompensaId: 'cat-4-p2' }); } catch (e) { bloqueado = true; }
    afirmar(bloqueado);
    await S.comoAdmin();
    igual(S.fidelizacion.configurar({ activa: true, umbral: 100, platoRecompensaId: 'cat-4-p2' }).ok, false);
    igual(S.fidelizacion.configurar({ activa: true, umbral: 150500, platoRecompensaId: 'cat-4-p2' }).ok, false);
    igual(S.fidelizacion.configurar({ activa: true, umbral: 150000, platoRecompensaId: 'no-existe' }).ok, false);
    igual(S.fidelizacion.configurar({ activa: true, umbral: 150000, platoRecompensaId: 'cat-4-p2' }).ok, true);
    igual(S.fidelizacion.platoRegalo(S.datos.leer()).nombre, 'Bocadillo veleño con queso');
  });

  prueba(M, 'Un cliente no puede canjearse regalos a sí mismo', async () => {
    await S.comoMesero();
    visita(5);
    const id = pedidoAbierto();
    await S.comoCliente();
    let bloqueado = false;
    try { S.fidelizacion.canjear(id); } catch (e) { bloqueado = true; }
    afirmar(bloqueado);
  });
})(window.SIGR);
