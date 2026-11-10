'use strict';
(function (S) {
  const { h } = S;
  const COLUMNAS = ['abierto', 'en_preparacion', 'listo', 'entregado'];

  const nombreMesa = (estado, id) => (estado.mesas.find((m) => m.id === id) || { nombre: 'Mesa' }).nombre;
  const nombreUsuario = (estado, id) => (estado.usuarios.find((u) => u.id === id) || { nombre: 'Sin asignar' }).nombre;

  function intentar(resultado, mensajeOk) {
    if (!resultado.ok) { S.avisar(resultado.errores[0], 'error'); return false; }
    if (mensajeOk) S.avisar(mensajeOk);
    return true;
  }

  function abrirPedido() {
    const estado = S.datos.leer();
    const ocupadas = S.pedidos.activos(estado).map((p) => p.mesaId);
    const libres = estado.mesas.filter((m) => !ocupadas.includes(m.id));
    S.dialogo('Abrir pedido', (cerrar) => {
      if (!libres.length) return S.vacio('Todas las mesas tienen un pedido sin pagar.');
      const mesa = h('select', null, libres.map((m) => h('option', { value: m.id }, m.nombre + ' (' + m.capacidad + ' puestos)')));
      return h('form', {
        class: 'formulario',
        onsubmit: (ev) => {
          ev.preventDefault();
          const r = S.pedidos.abrir(mesa.value);
          if (!intentar(r)) return;
          cerrar();
          S.refrescar();
          detalle(r.pedido.id);
        }
      },
        S.campo('Mesa', mesa),
        h('div', { class: 'acciones' },
          h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar }, 'Cancelar'),
          h('button', { class: 'boton boton--principal', type: 'submit' }, 'Abrir pedido')));
    });
  }

  function detalle(pedidoId) {
    S.dialogo('Pedido', (cerrar) => {
      const cuerpo = h('div');
      const salir = cerrar;

      function pintar() {
        const estado = S.datos.leer();
        const pedido = estado.pedidos.find((p) => p.id === pedidoId);
        const editable = pedido.estado === 'abierto';
        const t = S.pedidos.totales(pedido, estado.config.impoconsumo);
        const cliente = estado.usuarios.find((u) => u.id === pedido.clienteId);

        const plato = h('select', null, S.carta.agrupada(estado, true).map((g) =>
          h('optgroup', { label: g.categoria.nombre }, g.platos.map((p) => h('option', { value: p.id }, p.nombre + ' (' + S.dinero(p.precio) + ')')))));
        const cantidad = h('input', { type: 'number', min: '1', max: '20', value: '1', 'aria-label': 'Cantidad' });
        const telefono = h('input', { type: 'tel', inputmode: 'numeric', maxlength: '10', placeholder: 'Teléfono del cliente' });
        const motivo = h('input', { type: 'text', maxlength: '120', placeholder: 'Motivo de la cancelación' });

        cuerpo.replaceChildren(
          h('p', { class: 'pedido-resumen' },
            h('strong', null, 'Pedido ' + pedido.numero + ', ' + nombreMesa(estado, pedido.mesaId)), ' ',
            h('span', { class: 'etiqueta' }, S.pedidos.NOMBRE_ESTADO[pedido.estado]),
            h('br'), h('small', null, 'Atiende ' + nombreUsuario(estado, pedido.meseroId) + '. Abierto a las ' + S.horaCorta(pedido.creado) + '.')),

          pedido.items.length
            ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
              h('thead', null, h('tr', null, h('th', null, 'Plato'), h('th', { class: 'num' }, 'Cant.'), h('th', { class: 'num' }, 'Valor'), editable ? h('th') : null)),
              h('tbody', null, pedido.items.map((item, i) => h('tr', null,
                h('td', null, item.nombre, item.recompensa ? h('span', { class: 'etiqueta etiqueta--maiz' }, 'Regalo') : null),
                h('td', { class: 'num' }, item.cantidad),
                h('td', { class: 'num' }, item.recompensa ? S.dinero(0) : S.dinero(item.precio * item.cantidad)),
                editable ? h('td', { class: 'num' }, h('button', {
                  class: 'boton boton--plano boton--chico', type: 'button', 'aria-label': 'Quitar ' + item.nombre,
                  onclick: () => { intentar(S.pedidos.quitarItem(pedido.id, i)); pintar(); }
                }, 'Quitar')) : null))),
              h('tfoot', null,
                h('tr', null, h('td', { colspan: '2' }, 'Total'), h('td', { class: 'num' }, h('strong', null, S.dinero(t.total))), editable ? h('td') : null),
                h('tr', null, h('td', { colspan: editable ? '4' : '3' }, h('small', null, 'Incluye ' + S.dinero(t.impuesto) + ' de impuesto al consumo.'))))))
            : S.vacio('El pedido está vacío. Agrega el primer plato.'),

          editable ? h('form', {
            class: 'fila-agregar',
            onsubmit: (ev) => { ev.preventDefault(); intentar(S.pedidos.agregarPlato(pedido.id, plato.value, Number(cantidad.value))); pintar(); }
          }, plato, cantidad, h('button', { class: 'boton', type: 'submit' }, 'Agregar')) : null,

          h('div', { class: 'pedido-cliente' },
            cliente
              ? h('p', null, 'Cliente frecuente: ', h('strong', null, cliente.nombre), ' ',
                h('button', { class: 'boton boton--plano boton--chico', type: 'button', onclick: () => { intentar(S.pedidos.asignarCliente(pedido.id, '')); pintar(); } }, 'Quitar cliente'))
              : h('form', {
                class: 'fila-agregar',
                onsubmit: (ev) => { ev.preventDefault(); intentar(S.pedidos.asignarCliente(pedido.id, telefono.value), 'Cliente asociado al pedido'); pintar(); }
              }, telefono, h('button', { class: 'boton', type: 'submit' }, 'Asociar cliente')),
            S.extensionesPedido.map((extension) => extension(pedido, estado, pintar))),

          h('div', { class: 'acciones' },
            ['abierto', 'en_preparacion', 'listo'].includes(pedido.estado) ? h('form', {
              class: 'fila-agregar fila-agregar--izquierda',
              onsubmit: (ev) => { ev.preventDefault(); if (intentar(S.pedidos.cancelar(pedido.id, motivo.value), 'Pedido cancelado')) salir(); }
            }, motivo, h('button', { class: 'boton boton--peligro', type: 'submit' }, 'Cancelar pedido')) : null,
            S.pedidos.ACCION[pedido.estado] ? h('button', {
              class: 'boton boton--principal', type: 'button',
              onclick: () => { if (intentar(S.pedidos.avanzar(pedido.id), 'Pedido ' + pedido.numero + ': ' + S.pedidos.ACCION[pedido.estado].toLowerCase())) salir(); }
            }, S.pedidos.ACCION[pedido.estado]) : h('a', { class: 'boton boton--principal', href: '#/caja', onclick: cerrar }, 'Ir a caja para cobrar')));
      }

      pintar();
      return cuerpo;
    }, () => S.refrescar());
  }

  S.extensionesPedido = [];
  S.abrirDetallePedido = detalle;

  S.registrarVista({
    ruta: 'pedidos',
    titulo: 'Pedidos',
    resumen: 'Tablero de mesas y cocina',
    roles: ['admin', 'mesero'],
    render(contenedor) {
      const estado = S.datos.leer();
      const activos = S.pedidos.activos(estado);

      contenedor.append(h('div', { class: 'cabecera' },
        h('h1', null, 'Pedidos'),
        h('button', { class: 'boton boton--principal', type: 'button', onclick: abrirPedido }, 'Abrir pedido')));

      contenedor.append(h('div', { class: 'tablero' }, COLUMNAS.map((col) => {
        const pedidos = activos.filter((p) => p.estado === col).sort((a, b) => a.creado - b.creado);
        return h('section', { class: 'tablero__columna' },
          h('h2', null, S.pedidos.NOMBRE_ESTADO[col], ' ', h('span', { class: 'tablero__conteo' }, pedidos.length)),
          pedidos.length ? pedidos.map((p) => {
            const demorado = S.pedidos.estaDemorado(p);
            const unidades = p.items.reduce((s, i) => s + i.cantidad, 0);
            return h('article', { class: 'tarjeta-pedido' + (demorado ? ' tarjeta-pedido--demorado' : '') },
              h('h3', null, nombreMesa(estado, p.mesaId), h('small', null, 'Pedido ' + p.numero)),
              h('p', null, unidades + (unidades === 1 ? ' plato' : ' platos') + ', ' + S.dinero(S.pedidos.totales(p, estado.config.impoconsumo).total)),
              h('p', { class: 'tarjeta-pedido__tiempo' },
                demorado ? h('span', { class: 'etiqueta etiqueta--alerta' }, 'Demorado') : null,
                ' Hace ' + S.pedidos.minutosEnEstado(p) + ' min en este paso'),
              h('div', { class: 'tarjeta-pedido__acciones' },
                h('button', { class: 'boton boton--plano boton--chico', type: 'button', onclick: () => detalle(p.id) }, 'Ver pedido'),
                S.pedidos.ACCION[col] && col !== 'abierto' ? h('button', {
                  class: 'boton boton--chico', type: 'button',
                  onclick: () => { if (intentar(S.pedidos.avanzar(p.id))) S.refrescar(); }
                }, S.pedidos.ACCION[col]) : null));
          }) : h('p', { class: 'nota' }, 'Sin pedidos.'));
      })));
    }
  });
})(window.SIGR);
