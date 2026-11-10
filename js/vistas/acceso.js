'use strict';
(function (S) {
  const { h } = S;

  S.vistaAcceso = function (raiz, alEntrar) {
    let modo = 'entrar';

    function pintar(errores) {
      raiz.replaceChildren(
        h('main', { class: 'acceso' },
          h('div', { class: 'acceso__marca' },
            h('img', { src: 'img/totuma.svg', alt: '', width: '72', height: '72' }),
            h('h1', null, 'La Totuma'),
            h('p', null, 'Cocina santandereana. Sistema de gestión del restaurante.')),
          h('div', { class: 'acceso__panel' },
            h('div', { class: 'pestanas', role: 'tablist' },
              pestana('entrar', 'Iniciar sesión'),
              pestana('crear', 'Crear cuenta de cliente')),
            S.errores(errores),
            modo === 'entrar' ? formularioEntrar() : formularioCrear())));
      const primero = raiz.querySelector('input');
      if (primero) primero.focus();
    }

    function pestana(valor, texto) {
      return h('button', {
        type: 'button', role: 'tab', class: 'pestana' + (modo === valor ? ' pestana--activa' : ''),
        'aria-selected': modo === valor ? 'true' : 'false',
        onclick: () => { modo = valor; pintar(); }
      }, texto);
    }

    function formularioEntrar() {
      const usuario = h('input', { type: 'text', name: 'usuario', autocomplete: 'username', required: true, maxlength: '20' });
      const clave = h('input', { type: 'password', name: 'clave', autocomplete: 'current-password', required: true, maxlength: '64' });
      const boton = h('button', { class: 'boton boton--principal', type: 'submit' }, 'Iniciar sesión');
      return h('form', {
        class: 'formulario', novalidate: true,
        onsubmit: async (ev) => {
          ev.preventDefault();
          boton.disabled = true;
          const r = await S.seguridad.iniciarSesion(usuario.value, clave.value);
          if (r.ok) alEntrar(); else pintar([r.error]);
        }
      },
        S.campo('Usuario', usuario),
        S.campo('Contraseña', clave),
        boton,
        h('p', { class: 'nota' }, 'Las cuentas de prueba están en el archivo README del proyecto.'));
    }

    function formularioCrear() {
      const nombre = h('input', { type: 'text', autocomplete: 'name', required: true, maxlength: '60' });
      const telefono = h('input', { type: 'tel', inputmode: 'numeric', autocomplete: 'tel', maxlength: '10', required: true });
      const usuario = h('input', { type: 'text', autocomplete: 'username', required: true, maxlength: '20' });
      const clave = h('input', { type: 'password', autocomplete: 'new-password', required: true, maxlength: '64' });
      const boton = h('button', { class: 'boton boton--principal', type: 'submit' }, 'Crear cuenta');
      return h('form', {
        class: 'formulario', novalidate: true,
        onsubmit: async (ev) => {
          ev.preventDefault();
          boton.disabled = true;
          const r = await S.seguridad.crearUsuario({
            nombre: nombre.value, telefono: telefono.value, usuario: usuario.value, clave: clave.value, rol: 'cliente'
          });
          if (!r.ok) return pintar(r.errores);
          await S.seguridad.iniciarSesion(usuario.value, clave.value);
          alEntrar();
        }
      },
        S.campo('Nombre completo', nombre),
        S.campo('Teléfono', telefono, 'Con este número el mesero te encuentra para sumar tus consumos.'),
        S.campo('Usuario', usuario, 'De 4 a 20 caracteres, sin espacios.'),
        S.campo('Contraseña', clave, 'Mínimo 8 caracteres, con letras y números.'),
        boton);
    }

    pintar();
  };
})(window.SIGR);
