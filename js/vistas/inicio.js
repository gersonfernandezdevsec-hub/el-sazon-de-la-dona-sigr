'use strict';
(function (S) {
  const { h } = S;

  S.registrarVista({
    ruta: 'inicio',
    titulo: 'Inicio',
    roles: ['admin', 'mesero', 'cliente'],
    render(contenedor, usuario) {
      const otras = S.vistas.filter((v) => v.ruta !== 'inicio' && v.roles.includes(usuario.rol));
      contenedor.append(
        h('h1', null, 'Hola, ' + usuario.nombre.split(' ')[0]),
        h('p', { class: 'entrada' }, {
          admin: 'Desde aquí administras la carta, el equipo, la caja y el programa de clientes frecuentes.',
          mesero: 'Toma pedidos, atiende reservas y cobra las mesas.',
          cliente: 'Consulta la carta, reserva tu mesa y revisa cuánto te falta para tu postre.'
        }[usuario.rol]),
        otras.length
          ? h('ul', { class: 'accesos' }, otras.map((v) =>
            h('li', null, h('a', { href: '#/' + v.ruta }, h('strong', null, v.titulo), h('span', null, v.resumen || '')))))
          : S.vacio('Todavía no hay secciones disponibles para tu cuenta.'));
    }
  });
})(window.SIGR);
