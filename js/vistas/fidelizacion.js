'use strict';
(function (S) {
  const { h } = S;

  function tarjeta(saldo, regalo) {
    const casillas = [];
    for (let i = 1; i <= S.fidelizacion.SELLOS; i++) {
      const ultimo = i === S.fidelizacion.SELLOS;
      casillas.push(h('li', { class: 'sello' + (i <= saldo.sellos ? ' sello--puesto' : '') + (ultimo ? ' sello--premio' : '') },
        ultimo ? 'Postre' : i <= saldo.sellos ? h('img', { src: 'img/logo.svg', alt: '', width: '30', height: '30' }) : String(i)));
    }
    return h('div', { class: 'tarjeta-sellos' },
      h('ol', { class: 'tarjeta-sellos__casillas', 'aria-label': saldo.sellos + ' de ' + S.fidelizacion.SELLOS + ' sellos' }, casillas),
      h('p', { class: 'tarjeta-sellos__texto' },
        'Llevas ', h('strong', null, S.dinero(saldo.avance)), ' de ', S.dinero(saldo.umbral), '. Te faltan ',
        h('strong', null, S.dinero(saldo.falta)), ' para tu postre de regalo', regalo ? ': ' + regalo.nombre.toLowerCase() : '', '.'));
  }

  function vistaCliente(contenedor, usuario, estado) {
    const saldo = S.fidelizacion.estadoCliente(estado, usuario.id);
    const regalo = S.fidelizacion.platoRegalo(estado);
    const visitas = S.fidelizacion.historial(estado, usuario.id);

    contenedor.append(...[
      h('h1', null, 'Mi tarjeta'),
      h('p', { class: 'entrada' }, 'Cada ' + S.dinero(saldo.umbral) + ' que consumes en El Sazón de la Doña te ganas un postre de regalo' + (regalo ? ' (' + regalo.nombre.toLowerCase() + ')' : '') + '. Cada sello vale ' + S.dinero(saldo.umbral / S.fidelizacion.SELLOS) + '.'),
      estado.config.fidelizacion.activa ? null : h('p', { class: 'errores' }, 'El programa está en pausa. Tus consumos y regalos se conservan.'),
      saldo.disponibles ? h('p', { class: 'premio-listo' },
        h('strong', null, saldo.disponibles === 1 ? 'Tienes 1 postre de regalo.' : 'Tienes ' + saldo.disponibles + ' postres de regalo.'),
        ' Dile tu teléfono al mesero en tu próxima visita para pedirlo.') : null,
      tarjeta(saldo, regalo),
      h('section', { class: 'seccion' },
        h('h2', null, 'Mis visitas'),
        visitas.length ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla tabla--angosta' },
          h('thead', null, h('tr', null, h('th', null, 'Fecha'), h('th', { class: 'num' }, 'Consumo'), h('th', null, ''))),
          h('tbody', null, visitas.map((v) => h('tr', null,
            h('td', null, S.fechaLarga(S.fechaISO(v.fecha))), h('td', { class: 'num' }, S.dinero(v.total)),
            h('td', null, v.regalo ? h('span', { class: 'etiqueta etiqueta--maiz' }, 'Con postre de regalo') : null))))))
          : S.vacio('Aún no tienes visitas registradas. Cuando vengas, dale tu teléfono al mesero para que tu consumo sume.'))
    ].filter(Boolean));
  }

  function formularioConfig(estado) {
    const config = estado.config.fidelizacion;
    const zonaErrores = h('div');
    const umbral = h('input', { type: 'number', min: '50000', max: '2000000', step: '1000', value: String(config.umbral) });
    const postres = estado.platos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const plato = h('select', { value: config.platoRecompensaId }, postres.map((p) => h('option', { value: p.id }, p.nombre)));
    const activa = h('input', { type: 'checkbox' });
    activa.checked = config.activa;
    return h('form', {
      class: 'formulario panel', novalidate: true,
      onsubmit: (ev) => {
        ev.preventDefault();
        const r = S.fidelizacion.configurar({ activa: activa.checked, umbral: Number(umbral.value), platoRecompensaId: plato.value });
        if (!r.ok) return zonaErrores.replaceChildren(S.errores(r.errores));
        S.avisar('Programa actualizado');
        S.refrescar();
      }
    },
      h('h2', null, 'Reglas del programa'),
      zonaErrores,
      S.campo('Consumo para ganar el regalo', umbral, 'Al cambiarlo se recalculan los regalos de todos los clientes.'),
      S.campo('Plato que se regala', plato),
      h('label', { class: 'casilla' }, activa, ' Programa activo'),
      h('button', { class: 'boton boton--principal', type: 'submit' }, 'Guardar reglas'));
  }

  function vistaPersonal(contenedor, usuario, estado) {
    const clientes = S.fidelizacion.clientes(estado);
    const tabla = clientes.length ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, h('th', null, 'Cliente'), h('th', null, 'Teléfono'), h('th', { class: 'num' }, 'Consumo total'),
        h('th', null, 'Avance'), h('th', { class: 'num' }, 'Regalos por canjear'))),
      h('tbody', null, clientes.map((c) => {
        const barra = h('span', { class: 'barras__barra' });
        barra.style.width = Math.round((c.avance / c.umbral) * 100) + '%';
        return h('tr', null,
          h('td', null, c.cliente.nombre), h('td', null, c.cliente.telefono), h('td', { class: 'num' }, S.dinero(c.consumo)),
          h('td', null, h('span', { class: 'barras__pista' }, barra), h('small', null, 'Faltan ' + S.dinero(c.falta))),
          h('td', { class: 'num' }, c.disponibles ? h('span', { class: 'etiqueta etiqueta--maiz' }, c.disponibles) : '0'));
      }))))
      : S.vacio('Todavía no hay clientes registrados. Los clientes crean su cuenta desde la pantalla de acceso.');

    contenedor.append(
      h('h1', null, 'Clientes frecuentes'),
      h('p', { class: 'entrada' }, 'Para sumar el consumo, asocia el pedido al cliente con su teléfono. El regalo se agrega desde el pedido, antes de enviarlo a cocina.'),
      S.seguridad.puede(usuario, 'fidelizacion.configurar')
        ? h('div', { class: 'dos-columnas' }, formularioConfig(estado), h('section', null, tabla))
        : tabla);
  }

  S.extensionesPedido.push(function (pedido, estado, repintar) {
    if (!pedido.clienteId || !estado.config.fidelizacion.activa) return null;
    const saldo = S.fidelizacion.estadoCliente(estado, pedido.clienteId);
    const regalo = S.fidelizacion.platoRegalo(estado);
    const yaTiene = pedido.items.some((i) => i.recompensa);
    const quedan = saldo.disponibles;
    const plural = (n) => n + (n === 1 ? ' postre' : ' postres') + ' de regalo';
    if (yaTiene) {
      return h('p', { class: 'pedido-fidelizacion' }, 'Este pedido incluye su postre de regalo.' + (quedan ? ' Le quedan ' + plural(quedan) + ' para otra visita.' : ''));
    }
    if (!quedan) {
      return h('p', { class: 'pedido-fidelizacion' }, 'Le faltan ' + S.dinero(saldo.falta) + ' de consumo para su próximo postre.');
    }
    return h('p', { class: 'pedido-fidelizacion' }, 'Tiene ' + plural(quedan) + '. ',
      pedido.estado === 'abierto' ? h('button', {
        class: 'boton boton--chico', type: 'button',
        onclick: () => {
          const r = S.fidelizacion.canjear(pedido.id);
          S.avisar(r.ok ? 'Postre de regalo agregado' : r.errores[0], r.ok ? 'ok' : 'error');
          repintar();
        }
      }, 'Agregar postre de regalo' + (regalo ? ': ' + regalo.nombre.toLowerCase() : '')) : 'Se agrega antes de enviar el pedido a cocina.');
  });

  S.registrarVista({
    ruta: 'fidelizacion',
    titulo: 'Clientes frecuentes',
    resumen: 'Consumo acumulado y postres de regalo',
    roles: ['admin', 'mesero', 'cliente'],
    render(contenedor, usuario) {
      const estado = S.datos.leer();
      if (usuario.rol === 'cliente') vistaCliente(contenedor, usuario, estado);
      else vistaPersonal(contenedor, usuario, estado);
    }
  });
})(window.SIGR);
