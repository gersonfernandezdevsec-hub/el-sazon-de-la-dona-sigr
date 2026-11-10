'use strict';
(function (S) {
  const { h } = S;
  const NOMBRE_ROL = { admin: 'Administración', mesero: 'Mesero', cliente: 'Cliente' };

  function formularioPersonal() {
    const zonaErrores = h('div');
    const nombre = h('input', { type: 'text', maxlength: '60', required: true, autocomplete: 'off' });
    const usuario = h('input', { type: 'text', maxlength: '20', required: true, autocomplete: 'off' });
    const clave = h('input', { type: 'password', maxlength: '64', required: true, autocomplete: 'new-password' });
    const rol = h('select', null, h('option', { value: 'mesero' }, 'Mesero'), h('option', { value: 'admin' }, 'Administración'));
    const boton = h('button', { class: 'boton boton--principal', type: 'submit' }, 'Crear cuenta');
    return h('form', {
      class: 'formulario panel', novalidate: true,
      onsubmit: async (ev) => {
        ev.preventDefault();
        boton.disabled = true;
        const r = await S.seguridad.crearPersonal({ nombre: nombre.value, usuario: usuario.value, clave: clave.value, rol: rol.value });
        boton.disabled = false;
        if (!r.ok) return zonaErrores.replaceChildren(S.errores(r.errores));
        S.avisar('Cuenta creada para ' + r.usuario.nombre);
        S.refrescar();
      }
    },
      h('h2', null, 'Nueva cuenta de personal'),
      zonaErrores,
      S.campo('Nombre completo', nombre),
      S.campo('Usuario', usuario, 'De 4 a 20 caracteres, sin espacios.'),
      S.campo('Contraseña inicial', clave, 'Mínimo 8 caracteres, con letras y números.'),
      S.campo('Rol', rol),
      boton);
  }

  S.registrarVista({
    ruta: 'equipo',
    titulo: 'Equipo',
    resumen: 'Cuentas y permisos',
    roles: ['admin'],
    render(contenedor, actual) {
      const estado = S.datos.leer();
      const orden = { admin: 0, mesero: 1, cliente: 2 };
      const cuentas = estado.usuarios.slice().sort((a, b) => orden[a.rol] - orden[b.rol] || a.nombre.localeCompare(b.nombre, 'es'));
      const cambiar = (u, activo) => () => {
        const r = S.seguridad.cambiarActivo(u.id, activo);
        S.avisar(r.ok ? (activo ? 'Cuenta activada' : 'Cuenta desactivada') : r.errores[0], r.ok ? 'ok' : 'error');
        S.refrescar();
      };

      contenedor.append(
        h('div', { class: 'cabecera' }, h('h1', null, 'Equipo y cuentas')),
        h('div', { class: 'dos-columnas' },
          formularioPersonal(),
          h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
            h('thead', null, h('tr', null, h('th', null, 'Nombre'), h('th', null, 'Usuario'), h('th', null, 'Rol'), h('th', null, 'Estado'), h('th', null, ''))),
            h('tbody', null, cuentas.map((u) => {
              const bloqueada = u.bloqueadoHasta > S.ahora();
              return h('tr', null,
                h('td', null, u.nombre), h('td', null, u.usuario), h('td', null, NOMBRE_ROL[u.rol]),
                h('td', null, !u.activo ? h('span', { class: 'etiqueta etiqueta--alerta' }, 'Desactivada')
                  : bloqueada ? h('span', { class: 'etiqueta etiqueta--alerta' }, 'Bloqueada por intentos')
                    : h('span', { class: 'etiqueta' }, 'Activa')),
                h('td', null, u.id === actual.id ? h('small', null, 'Tu cuenta')
                  : u.activo
                    ? h('span', { class: 'tarjeta-pedido__acciones' },
                      bloqueada ? h('button', { class: 'boton boton--chico', type: 'button', onclick: cambiar(u, true) }, 'Desbloquear') : null,
                      h('button', {
                        class: 'boton boton--plano boton--chico', type: 'button',
                        onclick: () => S.confirmar('¿Desactivar la cuenta de ' + u.nombre + '? No podrá iniciar sesión.', 'Desactivar cuenta', cambiar(u, false))
                      }, 'Desactivar'))
                    : h('button', { class: 'boton boton--chico', type: 'button', onclick: cambiar(u, true) }, 'Activar')));
            }))))));
    }
  });

  const NOMBRE_ACCION = {
    'sesion.iniciada': 'Inicio de sesión', 'sesion.cerrada': 'Cierre de sesión', 'sesion.fallida': 'Intento fallido de acceso',
    'sesion.bloqueada': 'Cuenta bloqueada', 'acceso.denegado': 'Acceso denegado', 'usuario.creado': 'Cuenta creada',
    'usuario.activado': 'Cuenta activada', 'usuario.desactivado': 'Cuenta desactivada',
    'categoria.creada': 'Categoría creada', 'categoria.editada': 'Categoría editada', 'categoria.eliminada': 'Categoría eliminada',
    'plato.creado': 'Plato creado', 'plato.editado': 'Plato editado', 'plato.eliminado': 'Plato eliminado', 'plato.disponibilidad': 'Disponibilidad de plato',
    'pedido.en_preparacion': 'Pedido enviado a cocina', 'pedido.listo': 'Pedido listo', 'pedido.entregado': 'Pedido entregado', 'pedido.cancelado': 'Pedido cancelado',
    'reserva.creada': 'Reserva creada', 'reserva.cancelada': 'Reserva cancelada', 'reserva.cumplida': 'Reserva: asistió', 'reserva.no_asistio': 'Reserva: no asistió',
    'caja.cobro': 'Cobro', 'caja.cierre': 'Cierre de caja', 'fidelizacion.canje': 'Regalo canjeado', 'fidelizacion.configurada': 'Programa configurado'
  };
  const ALERTAS = ['sesion.fallida', 'sesion.bloqueada', 'acceso.denegado'];
  let soloAlertas = false;

  S.registrarVista({
    ruta: 'bitacora',
    titulo: 'Bitácora',
    resumen: 'Quién hizo qué y cuándo',
    roles: ['admin'],
    render(contenedor) {
      const estado = S.datos.leer();
      const nombre = (id) => (estado.usuarios.find((u) => u.id === id) || { nombre: 'Sin sesión' }).nombre;
      const registros = estado.bitacora.filter((b) => !soloAlertas || ALERTAS.includes(b.accion)).slice(-150).reverse();
      const filtro = h('input', { type: 'checkbox', onchange: (ev) => { soloAlertas = ev.target.checked; S.refrescar(); } });
      filtro.checked = soloAlertas;

      contenedor.append(
        h('div', { class: 'cabecera' }, h('h1', null, 'Bitácora'), h('label', { class: 'casilla' }, filtro, ' Solo alertas de seguridad')),
        h('p', { class: 'entrada' }, 'Registro de las acciones del sistema. Se conservan las últimas 500 y aquí se muestran las 150 más recientes.'),
        registros.length ? h('div', { class: 'tabla-envoltura' }, h('table', { class: 'tabla' },
          h('thead', null, h('tr', null, h('th', null, 'Fecha y hora'), h('th', null, 'Persona'), h('th', null, 'Acción'), h('th', null, 'Detalle'))),
          h('tbody', null, registros.map((b) => h('tr', null,
            h('td', { class: 'sin-salto' }, S.fechaHora(b.fecha)), h('td', null, nombre(b.usuarioId)),
            h('td', null, ALERTAS.includes(b.accion) ? h('span', { class: 'etiqueta etiqueta--alerta' }, NOMBRE_ACCION[b.accion]) : (NOMBRE_ACCION[b.accion] || b.accion)),
            h('td', null, b.detalle))))))
          : S.vacio(soloAlertas ? 'No hay alertas de seguridad registradas.' : 'La bitácora está vacía.'));
    }
  });
})(window.SIGR);
