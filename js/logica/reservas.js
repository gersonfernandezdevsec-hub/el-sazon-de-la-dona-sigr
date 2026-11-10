'use strict';
(function (S) {
  const APERTURA = 12 * 60;
  const ULTIMA_HORA = 20 * 60 + 30;
  const PASO = 30;
  const DURACION = 90;
  const DIAS_ANTICIPACION = 30;
  const MAX_ACTIVAS_CLIENTE = 2;
  const TOLERANCIA_MIN = 15;

  const falla = (...mensajes) => ({ ok: false, errores: mensajes });
  const aMinutos = (hora) => { const [h, m] = hora.split(':').map(Number); return h * 60 + m; };
  const aHora = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  const instante = (fecha, hora) => new Date(fecha + 'T' + hora + ':00').getTime();

  function horasDelDia() {
    const horas = [];
    for (let m = APERTURA; m <= ULTIMA_HORA; m += PASO) horas.push(aHora(m));
    return horas;
  }

  function mesaLibre(estado, fecha, hora, personas, ignorarId) {
    const inicio = aMinutos(hora);
    const ocupadas = estado.reservas
      .filter((r) => r.id !== ignorarId && r.fecha === fecha && r.estado === 'confirmada' && Math.abs(aMinutos(r.hora) - inicio) < DURACION)
      .map((r) => r.mesaId);
    return estado.mesas.filter((m) => m.capacidad >= personas && !ocupadas.includes(m.id))
      .sort((a, b) => a.capacidad - b.capacidad)[0] || null;
  }

  function horasDisponibles(estado, fecha, personas) {
    return horasDelDia().filter((hora) => instante(fecha, hora) > S.ahora() && mesaLibre(estado, fecha, hora, personas));
  }

  function validar(datos) {
    const errores = [];
    const personas = Number(datos.personas);
    const capacidadMaxima = Math.max(...S.datos.leer().mesas.map((m) => m.capacidad));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha || '') || Number.isNaN(instante(datos.fecha, '12:00'))) return ['Elige una fecha válida.'];
    if (!horasDelDia().includes(datos.hora)) errores.push('Elige una hora entre las 12:00 y las 20:30, en punto o y media.');
    else if (instante(datos.fecha, datos.hora) <= S.ahora()) errores.push('Esa fecha y hora ya pasaron.');
    if (instante(datos.fecha, '00:00') > S.ahora() + DIAS_ANTICIPACION * 86400000) errores.push('Solo se reserva con máximo ' + DIAS_ANTICIPACION + ' días de anticipación.');
    if (!Number.isInteger(personas) || personas < 1) errores.push('Indica cuántas personas vienen.');
    else if (personas > capacidadMaxima) errores.push('La mesa más grande es para ' + capacidadMaxima + ' personas. Para grupos mayores llama al restaurante.');
    const nombre = String(datos.nombre || '').trim();
    if (nombre.length < 3 || nombre.length > 60) errores.push('Escribe el nombre de quien reserva (3 a 60 caracteres).');
    if (!/^\d{7,10}$/.test(String(datos.telefono || '').trim())) errores.push('El teléfono debe tener entre 7 y 10 dígitos.');
    return errores;
  }

  function puedeGestionar(usuario, reserva) {
    if (S.seguridad.puede(usuario, 'reservas.gestionar')) return true;
    return S.seguridad.puede(usuario, 'reservas.propias') && reserva.clienteId === usuario.id;
  }

  S.reservas = {
    DURACION, TOLERANCIA_MIN, MAX_ACTIVAS_CLIENTE, horasDelDia, horasDisponibles, mesaLibre, validar, instante,

    estaRetrasada: (r) => r.estado === 'confirmada' && S.ahora() > instante(r.fecha, r.hora) + TOLERANCIA_MIN * 60000,

    visibles(estado, usuario) {
      const todas = S.seguridad.puede(usuario, 'reservas.gestionar');
      return estado.reservas.filter((r) => todas || r.clienteId === usuario.id)
        .sort((a, b) => instante(a.fecha, a.hora) - instante(b.fecha, b.hora));
    },

    crear(datos) {
      const usuario = S.seguridad.usuarioActual();
      const esPersonal = S.seguridad.puede(usuario, 'reservas.gestionar');
      if (!esPersonal && !S.seguridad.puede(usuario, 'reservas.propias')) S.seguridad.exigir('reservas.gestionar');

      const completos = esPersonal ? datos : Object.assign({}, datos, { nombre: usuario.nombre, telefono: usuario.telefono });
      const errores = validar(completos);
      if (errores.length) return { ok: false, errores };

      const r = S.datos.guardar((e) => {
        if (!esPersonal) {
          const activas = e.reservas.filter((x) => x.clienteId === usuario.id && x.estado === 'confirmada' && instante(x.fecha, x.hora) > S.ahora());
          if (activas.length >= MAX_ACTIVAS_CLIENTE) return falla('Ya tienes ' + MAX_ACTIVAS_CLIENTE + ' reservas vigentes. Cancela una para hacer otra.');
        }
        const personas = Number(completos.personas);
        const mesa = mesaLibre(e, completos.fecha, completos.hora, personas);
        if (!mesa) {
          const otras = horasDisponibles(e, completos.fecha, personas).slice(0, 4);
          return falla('No hay mesa para ' + personas + ' a las ' + completos.hora + '.' +
            (otras.length ? ' Horas con mesa ese día: ' + otras.join(', ') + '.' : ' Ese día no quedan mesas para ese grupo.'));
        }
        const reserva = {
          id: S.nuevoId('res'), fecha: completos.fecha, hora: completos.hora, personas, mesaId: mesa.id,
          nombre: String(completos.nombre).trim(), telefono: String(completos.telefono).trim(),
          clienteId: esPersonal ? null : usuario.id, estado: 'confirmada', creadaPor: usuario.id, creada: S.ahora()
        };
        e.reservas.push(reserva);
        return { ok: true, errores: [], reserva, mesa };
      });
      if (r.ok) S.seguridad.registrar('reserva.creada', r.reserva.fecha + ' ' + r.reserva.hora + ', ' + r.reserva.personas + ' personas, ' + r.mesa.nombre);
      return r;
    },

    cambiarEstado(id, nuevo) {
      const usuario = S.seguridad.usuarioActual();
      const r = S.datos.guardar((e) => {
        const reserva = e.reservas.find((x) => x.id === id);
        if (!reserva || !usuario || !puedeGestionar(usuario, reserva)) return falla('No tienes permiso sobre esta reserva.');
        if (reserva.estado !== 'confirmada') return falla('Esta reserva ya está cerrada.');
        if (!['cancelada', 'cumplida', 'no_asistio'].includes(nuevo)) return falla('Estado no válido.');
        if (nuevo !== 'cancelada' && !S.seguridad.puede(usuario, 'reservas.gestionar')) return falla('Solo el personal marca la asistencia.');
        reserva.estado = nuevo;
        return { ok: true, errores: [], reserva };
      });
      if (r.ok) S.seguridad.registrar('reserva.' + nuevo, r.reserva.fecha + ' ' + r.reserva.hora + ' ' + r.reserva.nombre);
      else if (r.errores[0].startsWith('No tienes permiso')) S.seguridad.registrar('acceso.denegado', 'reserva ' + id);
      return r;
    }
  };
})(window.SIGR);
