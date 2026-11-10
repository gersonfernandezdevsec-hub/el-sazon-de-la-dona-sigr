'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Seguridad';
  const valida = { nombre: 'Ana Gómez', usuario: 'anagomez', clave: 'Segura123', rol: 'cliente' };

  prueba(M, 'La contraseña no se guarda en texto', async () => {
    const r = await S.seguridad.crearUsuario(valida);
    afirmar(r.ok, 'debió crear la cuenta');
    const guardado = JSON.stringify(S.datos.leer().usuarios);
    afirmar(!guardado.includes('Segura123'), 'la contraseña aparece en los datos');
    igual(r.usuario.hash.length, 64);
  });

  prueba(M, 'Dos cuentas con la misma contraseña tienen hash distinto', async () => {
    const a = await S.seguridad.crearUsuario(valida);
    const b = await S.seguridad.crearUsuario(Object.assign({}, valida, { usuario: 'otra.ana' }));
    afirmar(a.usuario.hash !== b.usuario.hash, 'la sal no está funcionando');
  });

  prueba(M, 'Rechaza contraseñas débiles y usuarios repetidos', async () => {
    igual((await S.seguridad.crearUsuario(Object.assign({}, valida, { clave: 'corta1' }))).ok, false);
    igual((await S.seguridad.crearUsuario(Object.assign({}, valida, { clave: 'sololetras' }))).ok, false);
    await S.seguridad.crearUsuario(valida);
    igual((await S.seguridad.crearUsuario(valida)).ok, false);
  });

  prueba(M, 'Rechaza nombres de usuario con caracteres peligrosos', async () => {
    const r = await S.seguridad.crearUsuario(Object.assign({}, valida, { usuario: '<script>' }));
    igual(r.ok, false);
  });

  prueba(M, 'Inicia sesión con la contraseña correcta y falla con otra', async () => {
    await S.seguridad.crearUsuario(valida);
    igual((await S.seguridad.iniciarSesion('anagomez', 'Segura124')).ok, false);
    igual(S.seguridad.usuarioActual(), null);
    igual((await S.seguridad.iniciarSesion('AnaGomez ', 'Segura123')).ok, true);
    igual(S.seguridad.usuarioActual().usuario, 'anagomez');
  });

  prueba(M, 'El mensaje de error no revela si el usuario existe', async () => {
    await S.seguridad.crearUsuario(valida);
    const a = await S.seguridad.iniciarSesion('anagomez', 'Incorrecta1');
    const b = await S.seguridad.iniciarSesion('noexiste', 'Incorrecta1');
    igual(a.error, b.error);
  });

  prueba(M, 'Bloquea la cuenta al quinto intento fallido y la libera a los 5 minutos', async () => {
    const reloj = S.fijarReloj('2026-11-10T12:00:00');
    await S.seguridad.crearUsuario(valida);
    for (let i = 0; i < 5; i++) await S.seguridad.iniciarSesion('anagomez', 'Incorrecta1');
    const bloqueada = await S.seguridad.iniciarSesion('anagomez', 'Segura123');
    igual(bloqueada.ok, false, 'no debe entrar ni con la contraseña correcta');
    reloj.avanzar(S.seguridad.BLOQUEO_MS + 1000);
    igual((await S.seguridad.iniciarSesion('anagomez', 'Segura123')).ok, true);
  });

  prueba(M, 'La sesión se cierra tras 15 minutos sin actividad', async () => {
    const reloj = S.fijarReloj('2026-11-10T12:00:00');
    await S.seguridad.crearUsuario(valida);
    await S.seguridad.iniciarSesion('anagomez', 'Segura123');
    reloj.avanzar(10 * 60 * 1000);
    S.seguridad.marcarActividad();
    reloj.avanzar(10 * 60 * 1000);
    afirmar(S.seguridad.usuarioActual() !== null, 'hubo actividad: debe seguir abierta');
    reloj.avanzar(16 * 60 * 1000);
    igual(S.seguridad.usuarioActual(), null);
  });

  prueba(M, 'Cada rol solo tiene sus permisos', async () => {
    const puede = S.seguridad.puede;
    igual(puede({ rol: 'cliente' }, 'carta.editar'), false);
    igual(puede({ rol: 'mesero' }, 'caja.cerrar'), false);
    igual(puede({ rol: 'mesero' }, 'pedidos.gestionar'), true);
    igual(puede({ rol: 'admin' }, 'bitacora.ver'), true);
    igual(puede(null, 'carta.ver'), false);
  });

  prueba(M, 'exigir() bloquea y deja rastro en la bitácora', async () => {
    await S.seguridad.crearUsuario(valida);
    await S.seguridad.iniciarSesion('anagomez', 'Segura123');
    let bloqueo = false;
    try { S.seguridad.exigir('carta.editar'); } catch (e) { bloqueo = true; }
    afirmar(bloqueo, 'un cliente no puede editar la carta');
    afirmar(S.datos.leer().bitacora.some((b) => b.accion === 'acceso.denegado'), 'falta el registro');
  });

  prueba(M, 'Los datos de demostración cargan una sola vez', async () => {
    igual(await S.sembrar(), true);
    igual(await S.sembrar(), false);
    const e = S.datos.leer();
    igual(e.usuarios.length, 3);
    afirmar(e.platos.length >= 10, 'faltan platos');
  });
})(window.SIGR);
