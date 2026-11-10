'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Caja';
  const leer = (id) => S.datos.leer().pedidos.find((p) => p.id === id);

  S.pedidoEntregado = function (mesaId) {
    const id = S.pedidoDePrueba(mesaId);
    S.pedidos.avanzar(id); S.pedidos.avanzar(id); S.pedidos.avanzar(id);
    return id;
  };

  prueba(M, 'Cobra en efectivo y calcula el cambio', async () => {
    await S.comoMesero();
    const id = S.pedidoEntregado();
    const r = S.caja.cobrar(id, 'efectivo', 60000);
    igual(r.ok, true);
    igual(r.cambio, 8000);
    igual(leer(id).estado, 'pagado');
    igual(leer(id).pago.total, 52000);
  });

  prueba(M, 'Rechaza efectivo insuficiente y medios de pago desconocidos', async () => {
    await S.comoMesero();
    const id = S.pedidoEntregado();
    igual(S.caja.cobrar(id, 'efectivo', 50000).ok, false);
    igual(S.caja.cobrar(id, 'efectivo', 'mucho').ok, false);
    igual(S.caja.cobrar(id, 'cheque').ok, false);
    igual(leer(id).estado, 'entregado');
  });

  prueba(M, 'No cobra pedidos sin entregar ni cobra dos veces', async () => {
    await S.comoMesero();
    const enCocina = S.pedidoDePrueba('mesa-1');
    S.pedidos.avanzar(enCocina);
    igual(S.caja.cobrar(enCocina, 'tarjeta').ok, false);
    const id = S.pedidoEntregado('mesa-4');
    igual(S.caja.cobrar(id, 'tarjeta').ok, true);
    igual(S.caja.cobrar(id, 'tarjeta').ok, false);
  });

  prueba(M, 'El resumen del día suma por medio de pago y ordena los más vendidos', async () => {
    await S.comoMesero();
    S.caja.cobrar(S.pedidoEntregado('mesa-3'), 'efectivo', 52000);
    S.caja.cobrar(S.pedidoEntregado('mesa-4'), 'tarjeta');
    const cancelado = S.pedidoDePrueba('mesa-5');
    S.pedidos.cancelar(cancelado, 'Se fueron sin pedir');
    const r = S.caja.resumenDia(S.datos.leer(), '2026-11-10');
    igual(r.pedidos, 2);
    igual(r.total, 104000);
    igual(r.porMetodo, { efectivo: 52000, tarjeta: 52000, transferencia: 0 });
    igual(r.promedio, 52000);
    igual(r.masVendidos[0], { nombre: 'Limonada de panela', cantidad: 4 });
    igual(r.cancelados, 1);
    igual(S.caja.resumenDia(S.datos.leer(), '2026-11-09').total, 0);
  });

  prueba(M, 'Solo administración cierra la caja', async () => {
    await S.comoMesero();
    let bloqueado = false;
    try { S.caja.cerrarDia(); } catch (e) { bloqueado = true; }
    afirmar(bloqueado);
  });

  prueba(M, 'No se cierra la caja con pedidos pendientes ni dos veces el mismo día', async () => {
    await S.comoAdmin();
    const id = S.pedidoEntregado();
    igual(S.caja.cerrarDia().ok, false);
    S.caja.cobrar(id, 'transferencia');
    const cierre = S.caja.cerrarDia();
    igual(cierre.ok, true);
    igual(cierre.cierre.total, 52000);
    igual(S.caja.cerrarDia().ok, false);
  });

  prueba(M, 'Con la caja cerrada no se cobra hasta el día siguiente', async () => {
    const reloj = S.fijarReloj('2026-11-10T21:00:00');
    await S.comoAdmin();
    S.caja.cerrarDia();
    const id = S.pedidoEntregado();
    igual(S.caja.cobrar(id, 'tarjeta').ok, false);
    reloj.avanzar(15 * 3600000);
    await S.comoAdmin();
    igual(S.caja.cobrar(id, 'tarjeta').ok, true);
  });

  prueba(M, 'Las ventas recientes traen un valor por día', async () => {
    await S.comoMesero();
    S.caja.cobrar(S.pedidoEntregado(), 'tarjeta');
    const serie = S.caja.ventasRecientes(S.datos.leer(), 7);
    igual(serie.length, 7);
    igual(serie[6], { fecha: '2026-11-10', total: 52000 });
    igual(serie[0].fecha, '2026-11-04');
  });
})(window.SIGR);
