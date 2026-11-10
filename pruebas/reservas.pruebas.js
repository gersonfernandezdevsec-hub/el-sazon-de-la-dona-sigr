'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Reservas';
  const base = () => ({ fecha: '2026-11-12', hora: '19:00', personas: 4, nombre: 'Familia Rojas', telefono: '3101234567' });

  prueba(M, 'Asigna la mesa más pequeña que alcanza para el grupo', async () => {
    await S.comoMesero();
    const r = S.reservas.crear(Object.assign(base(), { personas: 3 }));
    igual(r.ok, true);
    igual(r.mesa.capacidad, 4);
    igual(S.reservas.crear(Object.assign(base(), { personas: 2 })).mesa.capacidad, 2);
  });

  prueba(M, 'No reserva dos veces la misma mesa en horarios que se cruzan', async () => {
    await S.comoMesero();
    igual(S.reservas.crear(Object.assign(base(), { personas: 8 })).ok, true);
    const choque = S.reservas.crear(Object.assign(base(), { personas: 8, hora: '20:00' }));
    igual(choque.ok, false);
    afirmar(/Horas con mesa/.test(choque.errores[0]), 'debe sugerir otras horas');
    igual(S.reservas.crear(Object.assign(base(), { personas: 8, hora: '20:30' })).ok, true, '90 minutos después ya está libre');
  });

  prueba(M, 'Rechaza fechas pasadas, horas fuera de horario y grupos imposibles', async () => {
    await S.comoMesero();
    igual(S.reservas.crear(Object.assign(base(), { fecha: '2026-11-09' })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { fecha: '2026-11-10', hora: '12:00' })).ok, false, 'la hora actual ya no sirve');
    igual(S.reservas.crear(Object.assign(base(), { hora: '23:00' })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { hora: '19:10' })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { personas: 9 })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { personas: 0 })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { fecha: '2027-01-15' })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { fecha: 'mañana' })).ok, false);
    igual(S.reservas.crear(Object.assign(base(), { telefono: 'abc' })).ok, false);
  });

  prueba(M, 'Las horas disponibles excluyen las que ya pasaron y las llenas', async () => {
    S.fijarReloj('2026-11-10T18:10:00');
    await S.comoMesero();
    S.reservas.crear(Object.assign(base(), { fecha: '2026-11-10', hora: '19:00', personas: 8 }));
    const horas = S.reservas.horasDisponibles(S.datos.leer(), '2026-11-10', 8);
    igual(horas, ['20:30']);
  });

  prueba(M, 'El cliente reserva a su nombre y solo ve sus reservas', async () => {
    await S.comoMesero();
    S.reservas.crear(base());
    await S.comoCliente();
    const r = S.reservas.crear(Object.assign(base(), { nombre: 'Otra persona', telefono: '3999999999', hora: '13:00' }));
    igual(r.ok, true);
    igual(r.reserva.nombre, 'Laura Ardila');
    igual(r.reserva.telefono, '3005550101');
    igual(S.reservas.visibles(S.datos.leer(), S.seguridad.usuarioActual()).length, 1);
  });

  prueba(M, 'El cliente tiene máximo dos reservas vigentes', async () => {
    await S.comoCliente();
    igual(S.reservas.crear(Object.assign(base(), { hora: '13:00' })).ok, true);
    igual(S.reservas.crear(Object.assign(base(), { fecha: '2026-11-13' })).ok, true);
    igual(S.reservas.crear(Object.assign(base(), { fecha: '2026-11-14' })).ok, false);
  });

  prueba(M, 'Un cliente no puede cancelar la reserva de otra persona', async () => {
    await S.comoMesero();
    const ajena = S.reservas.crear(base()).reserva;
    await S.comoCliente();
    igual(S.reservas.cambiarEstado(ajena.id, 'cancelada').ok, false);
    igual(S.datos.leer().reservas[0].estado, 'confirmada');
    const propia = S.reservas.crear(Object.assign(base(), { hora: '13:00' })).reserva;
    igual(S.reservas.cambiarEstado(propia.id, 'cumplida').ok, false, 'la asistencia la marca el personal');
    igual(S.reservas.cambiarEstado(propia.id, 'cancelada').ok, true);
  });

  prueba(M, 'Cancelar libera la mesa', async () => {
    await S.comoMesero();
    const r = S.reservas.crear(Object.assign(base(), { personas: 8 })).reserva;
    igual(S.reservas.crear(Object.assign(base(), { personas: 8 })).ok, false);
    S.reservas.cambiarEstado(r.id, 'cancelada');
    igual(S.reservas.crear(Object.assign(base(), { personas: 8 })).ok, true);
  });

  prueba(M, 'Avisa cuando el cliente lleva más de 15 minutos de retraso', async () => {
    const reloj = S.fijarReloj('2026-11-10T12:00:00');
    await S.comoMesero();
    const r = S.reservas.crear(Object.assign(base(), { fecha: '2026-11-10', hora: '13:00' })).reserva;
    reloj.avanzar(70 * 60000);
    igual(S.reservas.estaRetrasada(r), false);
    reloj.avanzar(6 * 60000);
    igual(S.reservas.estaRetrasada(r), true);
  });
})(window.SIGR);
