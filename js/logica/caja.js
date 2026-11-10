'use strict';
(function (S) {
  const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' };
  const falla = (mensaje) => ({ ok: false, errores: [mensaje] });

  const pagadosEl = (estado, fecha) => estado.pedidos.filter((p) => p.estado === 'pagado' && S.fechaISO(p.pago.fecha) === fecha);
  const diaCerrado = (estado, fecha) => estado.cierres.some((c) => c.fecha === fecha);

  function resumenDia(estado, fecha) {
    const pagados = pagadosEl(estado, fecha);
    const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    const unidades = {};
    let total = 0, impuesto = 0, regalos = 0;
    pagados.forEach((p) => {
      total += p.pago.total;
      impuesto += p.pago.impuesto;
      porMetodo[p.pago.metodo] += p.pago.total;
      p.items.forEach((i) => {
        if (i.recompensa) { regalos += i.cantidad; return; }
        unidades[i.nombre] = (unidades[i.nombre] || 0) + i.cantidad;
      });
    });
    const masVendidos = Object.entries(unidades).map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es')).slice(0, 5);
    return {
      fecha, pedidos: pagados.length, total, impuesto, porMetodo, masVendidos, regalos,
      promedio: pagados.length ? Math.round(total / pagados.length) : 0,
      cancelados: estado.pedidos.filter((p) => p.estado === 'cancelado' && S.fechaISO(p.creado) === fecha).length
    };
  }

  S.caja = {
    METODOS, resumenDia, diaCerrado,

    porCobrar: (estado) => estado.pedidos.filter((p) => p.estado === 'entregado').sort((a, b) => a.creado - b.creado),

    ventasRecientes(estado, dias) {
      const serie = [];
      for (let i = dias - 1; i >= 0; i--) {
        const fecha = S.fechaISO(S.ahora() - i * 86400000);
        serie.push({ fecha, total: pagadosEl(estado, fecha).reduce((s, p) => s + p.pago.total, 0) });
      }
      return serie;
    },

    cobrar(pedidoId, metodo, recibido) {
      const usuario = S.seguridad.exigir('caja.cobrar');
      const r = S.datos.guardar((e) => {
        const pedido = e.pedidos.find((p) => p.id === pedidoId);
        if (!pedido) return falla('El pedido no existe.');
        if (pedido.estado !== 'entregado') return falla('Solo se cobran pedidos que ya están en la mesa.');
        if (!METODOS[metodo]) return falla('Elige el medio de pago.');
        if (diaCerrado(e, S.fechaISO(S.ahora()))) return falla('La caja de hoy ya se cerró. El cobro debe hacerse mañana o reabrir con administración.');
        const t = S.pedidos.totales(pedido, e.config.impoconsumo);
        let cambio = 0, entregado = t.total;
        if (metodo === 'efectivo') {
          entregado = Number(recibido);
          if (!Number.isFinite(entregado) || entregado < t.total) return falla('El efectivo recibido no alcanza: el total es ' + S.dinero(t.total) + '.');
          cambio = entregado - t.total;
        }
        pedido.pago = { metodo, total: t.total, impuesto: t.impuesto, recibido: entregado, cambio, fecha: S.ahora(), cajeroId: usuario.id };
        S.pedidos.cambiarEstado(pedido, 'pagado', usuario.id);
        return { ok: true, errores: [], pedido, cambio };
      });
      if (r.ok) S.seguridad.registrar('caja.cobro', 'Pedido ' + r.pedido.numero + ', ' + METODOS[metodo] + ', ' + r.pedido.pago.total);
      return r;
    },

    cerrarDia() {
      const usuario = S.seguridad.exigir('caja.cerrar');
      const fecha = S.fechaISO(S.ahora());
      const r = S.datos.guardar((e) => {
        if (diaCerrado(e, fecha)) return falla('La caja de hoy ya está cerrada.');
        const pendientes = S.pedidos.activos(e).length;
        if (pendientes) return falla('Hay ' + pendientes + ' pedido(s) sin cobrar o cancelar. Ciérralos antes de cerrar la caja.');
        const cierre = Object.assign(resumenDia(e, fecha), { id: S.nuevoId('cie'), cerradoPor: usuario.id, cerradoEn: S.ahora() });
        e.cierres.push(cierre);
        return { ok: true, errores: [], cierre };
      });
      if (r.ok) S.seguridad.registrar('caja.cierre', fecha + ', total ' + r.cierre.total);
      return r;
    }
  };
})(window.SIGR);
