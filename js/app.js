'use strict';
(function (S) {
  const { h } = S;
  const raiz = document.getElementById('app');
  const NOMBRE_ROL = { admin: 'Administración', mesero: 'Mesero', cliente: 'Cliente' };

  function vistasPermitidas(usuario) {
    return S.vistas.filter((v) => v.roles.includes(usuario.rol));
  }

  function rutaActual() {
    return location.hash.replace(/^#\/?/, '') || 'inicio';
  }

  function pintar() {
    const usuario = S.seguridad.usuarioActual();
    if (!usuario) {
      S.vistaAcceso(raiz, () => { location.hash = '#/inicio'; pintar(); });
      return;
    }

    const permitidas = vistasPermitidas(usuario);
    const vista = permitidas.find((v) => v.ruta === rutaActual());
    const contenido = h('main', { class: 'contenido', id: 'contenido', tabindex: '-1' });

    raiz.replaceChildren(
      h('a', { class: 'saltar', href: '#contenido' }, 'Saltar al contenido'),
      h('div', { class: 'marco' },
        h('header', { class: 'barra' },
          h('a', { class: 'barra__marca', href: '#/inicio' },
            h('img', { src: 'img/totuma.svg', alt: '', width: '32', height: '32' }), 'La Totuma'),
          h('nav', { class: 'barra__nav', 'aria-label': 'Secciones' },
            permitidas.map((v) => h('a', {
              href: '#/' + v.ruta, class: 'barra__enlace', 'aria-current': vista === v ? 'page' : null
            }, v.titulo))),
          h('div', { class: 'barra__usuario' },
            h('span', null, usuario.nombre, h('small', null, NOMBRE_ROL[usuario.rol])),
            h('button', {
              class: 'boton boton--plano', type: 'button',
              onclick: () => { S.seguridad.cerrarSesion('manual'); location.hash = ''; pintar(); }
            }, 'Cerrar sesión'))),
        contenido));

    if (!vista) {
      if (S.vistas.some((v) => v.ruta === rutaActual())) S.seguridad.registrar('acceso.denegado', 'vista ' + rutaActual());
      contenido.append(S.vacio('Esta sección no existe o tu cuenta no tiene acceso.',
        h('a', { class: 'boton', href: '#/inicio' }, 'Ir al inicio')));
      return;
    }
    document.title = vista.titulo + ' | La Totuma';
    vista.render(contenido, usuario);
  }

  S.refrescar = pintar;

  window.addEventListener('hashchange', pintar);
  window.addEventListener('storage', (ev) => {
    if (ev.key === S.datos.CLAVE && !document.querySelector('dialog[open]')) pintar();
  });
  ['click', 'keydown'].forEach((tipo) => document.addEventListener(tipo, () => S.seguridad.marcarActividad(), true));
  setInterval(() => {
    if (document.querySelector('.marco') && !S.seguridad.usuarioActual()) {
      pintar();
      S.avisar('La sesión se cerró por inactividad. Inicia sesión de nuevo.', 'error');
    }
  }, 30000);

  if (!window.crypto || !crypto.subtle) {
    raiz.replaceChildren(S.vacio('Este navegador no permite cifrar contraseñas en esta dirección. Abre el sistema desde https o desde localhost.'));
    return;
  }
  S.sembrar().then(pintar);
})(window.SIGR);
