'use strict';
window.SIGR = window.SIGR || {};
(function (S) {
  const ITERACIONES = 100000;
  const MAX_INTENTOS = 5;
  const BLOQUEO_MS = 5 * 60 * 1000;
  const INACTIVIDAD_MS = 15 * 60 * 1000;
  const CLAVE_SESION = 'sigr.totuma.sesion';

  const PERMISOS = {
    admin: ['carta.ver', 'carta.editar', 'pedidos.gestionar', 'reservas.gestionar', 'caja.cobrar', 'caja.cerrar',
      'fidelizacion.gestionar', 'fidelizacion.configurar', 'usuarios.gestionar', 'bitacora.ver'],
    mesero: ['carta.ver', 'pedidos.gestionar', 'reservas.gestionar', 'caja.cobrar', 'fidelizacion.gestionar'],
    cliente: ['carta.ver', 'reservas.propias', 'fidelizacion.propia']
  };

  const aHex = (bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  const deHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));

  async function derivar(clave, salHex) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(salHex), iterations: ITERACIONES }, material, 256);
    return aHex(bits);
  }

  function iguales(a, b) {
    if (a.length !== b.length) return false;
    let diferencia = 0;
    for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diferencia === 0;
  }

  const limpiar = (texto) => String(texto == null ? '' : texto).trim();

  function validarUsuario({ nombre, usuario, clave, rol, telefono }, existentes) {
    const errores = [];
    if (limpiar(nombre).length < 3 || limpiar(nombre).length > 60) errores.push('El nombre debe tener entre 3 y 60 caracteres.');
    if (!/^[a-z0-9._-]{4,20}$/.test(limpiar(usuario).toLowerCase())) {
      errores.push('El usuario debe tener de 4 a 20 caracteres: letras, números, punto, guion o guion bajo.');
    }
    if (existentes.some((u) => u.usuario === limpiar(usuario).toLowerCase())) errores.push('Ese nombre de usuario ya está en uso.');
    if (String(clave || '').length < 8 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave) || !/\d/.test(clave)) {
      errores.push('La contraseña debe tener mínimo 8 caracteres, con al menos una letra y un número.');
    }
    if (!PERMISOS[rol]) errores.push('El rol no es válido.');
    if (rol === 'cliente' && !limpiar(telefono)) errores.push('El teléfono es obligatorio para los clientes.');
    else if (telefono && !/^\d{7,10}$/.test(limpiar(telefono))) errores.push('El teléfono debe tener entre 7 y 10 dígitos.');
    else if (rol === 'cliente' && existentes.some((u) => u.rol === 'cliente' && u.telefono === limpiar(telefono))) {
      errores.push('Ya hay una cuenta de cliente con ese teléfono.');
    }
    return errores;
  }

  async function construirUsuario({ nombre, usuario, clave, rol, telefono }) {
    const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
    return {
      id: S.nuevoId('usr'),
      nombre: limpiar(nombre),
      usuario: limpiar(usuario).toLowerCase(),
      rol,
      telefono: limpiar(telefono),
      sal,
      hash: await derivar(clave, sal),
      activo: true,
      intentosFallidos: 0,
      bloqueadoHasta: 0,
      creado: S.ahora()
    };
  }

  function registrar(accion, detalle, usuarioId) {
    S.datos.guardar((e) => {
      const actor = usuarioId || (leerSesion() || {}).usuarioId || null;
      e.bitacora.push({ id: S.nuevoId('bit'), fecha: S.ahora(), usuarioId: actor, accion, detalle: String(detalle || '') });
      if (e.bitacora.length > 500) e.bitacora.splice(0, e.bitacora.length - 500);
    });
  }

  function leerSesion() {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_SESION)); } catch (e) { return null; }
  }

  S.seguridad = {
    MAX_INTENTOS, BLOQUEO_MS, INACTIVIDAD_MS, PERMISOS,
    validarUsuario, construirUsuario, registrar,

    async crearUsuario(datos) {
      const errores = validarUsuario(datos, S.datos.leer().usuarios);
      if (errores.length) return { ok: false, errores };
      const usuario = await construirUsuario(datos);
      S.datos.guardar((e) => { e.usuarios.push(usuario); });
      registrar('usuario.creado', usuario.usuario + ' (' + usuario.rol + ')');
      return { ok: true, errores: [], usuario };
    },

    async iniciarSesion(usuarioTexto, clave) {
      const nombreUsuario = limpiar(usuarioTexto).toLowerCase();
      const generico = 'Usuario o contraseña incorrectos.';
      const cuenta = S.datos.leer().usuarios.find((u) => u.usuario === nombreUsuario);

      if (!cuenta || !cuenta.activo) {
        await derivar(String(clave), '00000000000000000000000000000000');
        return { ok: false, error: generico };
      }
      if (cuenta.bloqueadoHasta > S.ahora()) {
        const minutos = Math.ceil((cuenta.bloqueadoHasta - S.ahora()) / 60000);
        return { ok: false, error: 'Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ' + minutos + ' min.' };
      }

      const correcto = iguales(await derivar(String(clave), cuenta.sal), cuenta.hash);
      if (!correcto) {
        const bloqueada = S.datos.guardar((e) => {
          const u = e.usuarios.find((x) => x.id === cuenta.id);
          u.intentosFallidos += 1;
          if (u.intentosFallidos >= MAX_INTENTOS) {
            u.bloqueadoHasta = S.ahora() + BLOQUEO_MS;
            u.intentosFallidos = 0;
            return true;
          }
          return false;
        });
        registrar(bloqueada ? 'sesion.bloqueada' : 'sesion.fallida', cuenta.usuario, cuenta.id);
        return { ok: false, error: bloqueada ? 'Cuenta bloqueada por 5 minutos tras 5 intentos fallidos.' : generico };
      }

      S.datos.guardar((e) => {
        const u = e.usuarios.find((x) => x.id === cuenta.id);
        u.intentosFallidos = 0;
        u.bloqueadoHasta = 0;
      });
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ usuarioId: cuenta.id, ultimaActividad: S.ahora() }));
      registrar('sesion.iniciada', cuenta.usuario, cuenta.id);
      return { ok: true, usuario: cuenta };
    },

    cerrarSesion(motivo) {
      const sesion = leerSesion();
      if (sesion) registrar('sesion.cerrada', motivo || 'manual', sesion.usuarioId);
      sessionStorage.removeItem(CLAVE_SESION);
    },

    usuarioActual() {
      const sesion = leerSesion();
      if (!sesion) return null;
      if (S.ahora() - sesion.ultimaActividad > INACTIVIDAD_MS) {
        this.cerrarSesion('inactividad');
        return null;
      }
      const usuario = S.datos.leer().usuarios.find((u) => u.id === sesion.usuarioId && u.activo);
      if (!usuario) { sessionStorage.removeItem(CLAVE_SESION); return null; }
      return usuario;
    },

    marcarActividad() {
      const sesion = leerSesion();
      if (!sesion) return;
      if (S.ahora() - sesion.ultimaActividad > INACTIVIDAD_MS) return;
      sesion.ultimaActividad = S.ahora();
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    },

    puede(usuario, permiso) {
      return !!usuario && (PERMISOS[usuario.rol] || []).includes(permiso);
    },

    exigir(permiso) {
      const usuario = this.usuarioActual();
      if (!this.puede(usuario, permiso)) {
        registrar('acceso.denegado', permiso);
        throw new Error('No tienes permiso para hacer esto.');
      }
      return usuario;
    }
  };
})(window.SIGR);
