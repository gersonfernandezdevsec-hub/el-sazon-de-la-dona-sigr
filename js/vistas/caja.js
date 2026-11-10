'use strict';
(function (S) {
  const { h } = S;

  function cobrar(pedido, estado) {
    const t = S.pedidos.totales(pedido, estado.config.impoconsumo);
    S.dialogo('Cobrar pedido ' + pedido.numero, (cerrar) => {
      const zonaErrores = h('div');
      const metodo = h('select', null, Object.entries(S.caja.METODOS).map(([valor, nombre]) => h('option', { value: valor }, nombre)));
      const recibido = h('input', { type: 'number', min: String(t.total), step: '100', value: String(t.total) });
      const cambio = h('strong', null, S.dinero(0));
      const campoRecibido = S.campo('Efectivo recibido', recibido);
      const lineaCambio = h('p', null, 'Cambio para el cliente: ', cambio);
      const actualizar = () => {
        const efectivo = metodo.value === 'efectivo';
        campoRecibido.hidden = lineaCambio.hidden = !efectivo;
        cambio.textContent = S.dinero(Math.max(0, Number(recibido.value) - t.total));
      };
      metodo.addEventListener('change', actualizar);
      recibido.addEventListener('input', actualizar);
      actualizar();

      return h('form', {
        class: 'formulario', novalidate: true,
        onsubmit: (ev) => {
          ev.preventDefault();
          const r = S.caja.cobrar(pedido.id, metodo.value, Number(recibido.value));
          if (!r.ok) return zonaErrores.replaceChildren(S.errores(r.errores));
          cerrar();
          S.avisar('Pedido ' + pedido.numero + ' cobrado' + (r.cambio ? '. Cambio: ' + S.dinero(r.cambio) : ''));
          S.refrescar();
        }
      },
        zonaErrores,
        h('p', { class: 'total-grande' }, S.dinero(t.total), h('small', null, 'Incluye ' + S.dinero(t.impuesto) + ' de impuesto al consumo')),
        h('ul', { class: 'lista-simple' }, pedido.items.map((i) => h('li', null, i.cantidad + ' × ' + i.nombre + (i.recompensa ? ' (regalo)' : '')))),
        S.campo('Medio de pago', metodo), campoRecibido, lineaCambio,
        h('div', { class: 'acciones' },
          h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar }, 'Cancelar'),
          h('button', { class: 'boton boton--principal', type: 'submit' }, 'Registrar pago')));
    });
  }

  function barras(serie) {
    const maximo = Math.max(1, ...serie.map((d) => d.total));
    return h('ul', { class: 'barras' }, serie.map((d) => {
      const barra = h('span', { class: 'barras__barra' });
      barra.style.width = Math.round((d.total / maximo) * 100) + '%';
      return h('li', null,
        h('span', { class: 'barras__dia' }, new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })),
        h('span', { class: 'barras__pista' }, barra),
        h('span', { class: 'barras__valor' }, S.dinero(d.total)));
    }));
  }

  S.registrarVista({
    ruta: 'caja',
    titulo: 'Caja',
    resumen: 'Cobros, ventas del día y cierre',
    roles: ['admin', 'mesero'],
    render(contenedor, usuario) {
      const estado = S.datos.leer();
      const hoy = S.fechaISO(S.ahora());
      const resumen = S.caja.resumenDia(estado, hoy);
      const pendientes = S.caja.porCobrar(estado);
      const cerrado = S.caja.diaCerrado(estado, hoy);
      const puedeCerrar = S.seguridad.puede(usuario, 'caja.cerrar');
      const mesa = (id) => (estado.mesas.find((m) => m.id === id) || { nombre: 'Mesa' }).nombre;

      contenedor.append(
        h('div', { class: 'cabecera' },
          h('h1', null, 'Caja'),
          cerrado ? h('span', { class: 'etiqueta etiqueta--maiz' }, 'Caja de hoy cerrada')
            : puedeCerrar ? h('button', {
              class: 'boton', type: 'button',
              onclick: () => S.confirmar('¿Cerrar la caja de hoy con ' + S.dinero(resumen.total) + ' en ventas? Después no se podrán registrar más cobros hoy.', 'Cerrar caja', () => {
                const r = S.caja.cerrarDia();
                S.avisar(r.ok ? 'Caja cerrada' : r.errores[0], r.ok ? 'ok' : 'error');
                S.refrescar();
              })
            }, 'Cerrar caja de hoy') : null),

        h('div', { class: 'dos-columnas dos-columnas--iguales' },
          h('section', null,
            h('h2', null, 'Por cobrar'),
            pendientes.length ? h('ul', { class: 'cuentas' }, pendientes.map((p) => h('li', null,
              h('div', null, h('strong', null, mesa(p.mesaId)), h('small', null, ' Pedido ' + p.numero)),
              h('div', { class: 'cuentas__valor' }, S.dinero(S.pedidos.totales(p, estado.config.impoconsumo).total)),
              h('button', { class: 'boton boton--principal boton--chico', type: 'button', disabled: cerrado, onclick: () => cobrar(p, estado) }, 'Cobrar'))))
              : S.vacio('No hay cuentas por cobrar. Aquí aparecen los pedidos cuando se entregan en la mesa.')),

          h('section', { class: 'panel' },
            h('h2', null, 'Ventas de hoy'),
            h('p', { class: 'total-grande' }, S.dinero(resumen.total),
              h('small', null, resumen.pedidos + (resumen.pedidos === 1 ? ' pedido cobrado' : ' pedidos cobrados') + ', promedio ' + S.dinero(resumen.promedio))),
            h('table', { class: 'tabla tabla--sin-borde' }, h('tbody', null,
              Object.entries(S.caja.METODOS).map(([clave, nombre]) => h('tr', null, h('td', null, nombre), h('td', { class: 'num' }, S.dinero(resumen.porMetodo[clave])))),
              h('tr', null, h('td', null, 'Impuesto al consumo incluido'), h('td', { class: 'num' }, S.dinero(resumen.impuesto))),
              h('tr', null, h('td', null, 'Postres de regalo entregados'), h('td', { class: 'num' }, resumen.regalos)),
              h('tr', null, h('td', null, 'Pedidos cancelados'), h('td', { class: 'num' }, resumen.cancelados)))),
            h('h3', null, 'Lo más vendido hoy'),
            resumen.masVendidos.length
              ? h('ol', { class: 'lista-simple' }, resumen.masVendidos.map((v) => h('li', null, v.nombre + ': ' + v.cantidad)))
              : h('p', { class: 'nota' }, 'Aún no hay ventas hoy.'))));

      if (puedeCerrar) {
        contenedor.append(
          h('section', { class: 'seccion' }, h('h2', null, 'Ventas de los últimos 7 días'), barras(S.caja.ventasRecientes(estado, 7))),
          h('section', { class: 'seccion' },
            h('h2', null, 'Cierres de caja'),
            estado.cierres.length ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
              h('thead', null, h('tr', null, h('th', null, 'Fecha'), h('th', { class: 'num' }, 'Pedidos'), h('th', { class: 'num' }, 'Efectivo'),
                h('th', { class: 'num' }, 'Tarjeta'), h('th', { class: 'num' }, 'Transferencia'), h('th', { class: 'num' }, 'Total'), h('th', null, 'Cerró'))),
              h('tbody', null, estado.cierres.slice().reverse().map((c) => h('tr', null,
                h('td', null, c.fecha), h('td', { class: 'num' }, c.pedidos), h('td', { class: 'num' }, S.dinero(c.porMetodo.efectivo)),
                h('td', { class: 'num' }, S.dinero(c.porMetodo.tarjeta)), h('td', { class: 'num' }, S.dinero(c.porMetodo.transferencia)),
                h('td', { class: 'num' }, h('strong', null, S.dinero(c.total))),
                h('td', null, (estado.usuarios.find((u) => u.id === c.cerradoPor) || { nombre: '' }).nombre + ', ' + S.horaCorta(c.cerradoEn)))))))
              : S.vacio('Todavía no se ha cerrado ninguna caja.')));
      }
    }
  });
})(window.SIGR);
