'use strict';
(function (S) {
  const { h } = S;
  const NOMBRE_ESTADO = { confirmada: 'Confirmada', cancelada: 'Cancelada', cumplida: 'Asistió', no_asistio: 'No asistió' };
  let fechaAgenda = null;

  function formulario(usuario, alGuardar) {
    const esPersonal = S.seguridad.puede(usuario, 'reservas.gestionar');
    const hoy = S.fechaISO(S.ahora());
    const zonaErrores = h('div');
    const fecha = h('input', { type: 'date', min: hoy, max: S.fechaISO(S.ahora() + 30 * 86400000), required: true, value: fechaAgenda || hoy });
    const personas = h('input', { type: 'number', min: '1', max: '8', required: true, value: '2' });
    const hora = h('select', { required: true });
    const ayudaHora = h('span', { class: 'campo__ayuda' });
    const nombre = h('input', { type: 'text', maxlength: '60', required: true });
    const telefono = h('input', { type: 'tel', inputmode: 'numeric', maxlength: '10', required: true });
    const boton = h('button', { class: 'boton boton--principal', type: 'submit' }, 'Reservar mesa');

    function actualizarHoras() {
      const n = Number(personas.value);
      const libres = fecha.value && n >= 1 ? S.reservas.horasDisponibles(S.datos.leer(), fecha.value, n) : [];
      hora.replaceChildren(...libres.map((x) => h('option', { value: x }, x)));
      boton.disabled = !libres.length;
      ayudaHora.textContent = libres.length ? 'La mesa se guarda 90 minutos.' : 'No hay mesas para ese grupo en esa fecha. Prueba otro día o menos personas.';
    }
    fecha.addEventListener('change', actualizarHoras);
    personas.addEventListener('input', actualizarHoras);
    actualizarHoras();

    return h('form', {
      class: 'formulario panel', novalidate: true,
      onsubmit: (ev) => {
        ev.preventDefault();
        const r = S.reservas.crear({ fecha: fecha.value, hora: hora.value, personas: Number(personas.value), nombre: nombre.value, telefono: telefono.value });
        if (!r.ok) { zonaErrores.replaceChildren(S.errores(r.errores)); actualizarHoras(); return; }
        S.avisar('Reserva confirmada: ' + S.fechaLarga(r.reserva.fecha) + ' a las ' + r.reserva.hora + ', ' + r.mesa.nombre);
        alGuardar(r.reserva);
      }
    },
      h('h2', null, esPersonal ? 'Nueva reserva' : 'Reservar mesa'),
      zonaErrores,
      h('div', { class: 'fila-campos' }, S.campo('Fecha', fecha), S.campo('Personas', personas)),
      h('label', { class: 'campo' }, h('span', { class: 'campo__etiqueta' }, 'Hora'), hora, ayudaHora),
      esPersonal ? [S.campo('A nombre de', nombre), S.campo('Teléfono de contacto', telefono)]
        : h('p', { class: 'nota' }, 'La reserva queda a nombre de ' + usuario.nombre + ', teléfono ' + (usuario.telefono || 'sin registrar') + '.'),
      boton);
  }

  function fila(reserva, estado, usuario) {
    const esPersonal = S.seguridad.puede(usuario, 'reservas.gestionar');
    const mesa = estado.mesas.find((m) => m.id === reserva.mesaId) || { nombre: '' };
    const retrasada = S.reservas.estaRetrasada(reserva);
    const cambiar = (nuevo, mensaje) => () => {
      const r = S.reservas.cambiarEstado(reserva.id, nuevo);
      S.avisar(r.ok ? mensaje : r.errores[0], r.ok ? 'ok' : 'error');
      S.refrescar();
    };
    return h('tr', null,
      esPersonal ? null : h('td', null, S.fechaLarga(reserva.fecha)),
      h('td', { class: 'num' }, reserva.hora),
      h('td', null, reserva.nombre, esPersonal ? [h('br'), h('small', null, reserva.telefono)] : null),
      h('td', { class: 'num' }, reserva.personas),
      h('td', null, mesa.nombre),
      h('td', null, retrasada
        ? h('span', { class: 'etiqueta etiqueta--alerta' }, 'Retrasada')
        : h('span', { class: 'etiqueta' + (reserva.estado === 'confirmada' ? '' : ' etiqueta--maiz') }, NOMBRE_ESTADO[reserva.estado])),
      h('td', null, reserva.estado === 'confirmada' ? h('div', { class: 'tarjeta-pedido__acciones' },
        esPersonal ? h('button', { class: 'boton boton--chico', type: 'button', onclick: cambiar('cumplida', 'Asistencia registrada') }, 'Llegó') : null,
        esPersonal ? h('button', { class: 'boton boton--plano boton--chico', type: 'button', onclick: cambiar('no_asistio', 'Marcada como no asistió') }, 'No asistió') : null,
        h('button', {
          class: 'boton boton--plano boton--chico', type: 'button',
          onclick: () => S.confirmar('¿Cancelar la reserva de ' + reserva.nombre + ' a las ' + reserva.hora + '?', 'Cancelar reserva', cambiar('cancelada', 'Reserva cancelada'))
        }, 'Cancelar')) : null));
  }

  S.registrarVista({
    ruta: 'reservas',
    titulo: 'Reservas',
    resumen: 'Mesas por fecha y hora',
    roles: ['admin', 'mesero', 'cliente'],
    render(contenedor, usuario) {
      const esPersonal = S.seguridad.puede(usuario, 'reservas.gestionar');
      const estado = S.datos.leer();
      const hoy = S.fechaISO(S.ahora());
      if (!fechaAgenda) fechaAgenda = hoy;

      let lista = S.reservas.visibles(estado, usuario);
      lista = esPersonal ? lista.filter((r) => r.fecha === fechaAgenda) : lista.filter((r) => r.fecha >= hoy);

      const selectorFecha = h('input', { type: 'date', value: fechaAgenda, 'aria-label': 'Fecha de la agenda', onchange: (ev) => { fechaAgenda = ev.target.value || hoy; S.refrescar(); } });

      contenedor.append(
        h('div', { class: 'cabecera' }, h('h1', null, esPersonal ? 'Reservas' : 'Mis reservas')),
        h('div', { class: 'dos-columnas' },
          formulario(usuario, (reserva) => { fechaAgenda = reserva.fecha; S.refrescar(); }),
          h('section', null,
            esPersonal ? h('div', { class: 'cabecera' }, h('h2', null, 'Agenda del ' + S.fechaLarga(fechaAgenda)), h('div', null, selectorFecha)) : h('h2', null, 'Próximas reservas'),
            lista.length
              ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
                h('thead', null, h('tr', null,
                  esPersonal ? null : h('th', null, 'Fecha'), h('th', { class: 'num' }, 'Hora'), h('th', null, 'A nombre de'),
                  h('th', { class: 'num' }, 'Personas'), h('th', null, 'Mesa'), h('th', null, 'Estado'), h('th', null, 'Acciones'))),
                h('tbody', null, lista.map((r) => fila(r, estado, usuario)))))
              : S.vacio(esPersonal ? 'No hay reservas para este día.' : 'Todavía no tienes reservas. Usa el formulario para apartar tu mesa.'))));
    }
  });
})(window.SIGR);
