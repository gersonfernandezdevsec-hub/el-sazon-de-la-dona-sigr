'use strict';
(function (S) {
  const { h } = S;

  function formularioPlato(plato, cerrar) {
    const estado = S.datos.leer();
    const zonaErrores = h('div');
    const nombre = h('input', { type: 'text', maxlength: '50', required: true, value: plato ? plato.nombre : '' });
    const descripcion = h('textarea', { rows: '2', maxlength: '140' }, plato ? plato.descripcion : '');
    const precio = h('input', { type: 'number', min: '500', max: '500000', step: '100', required: true, value: plato ? plato.precio : '' });
    const categoria = h('select', { value: plato ? plato.categoriaId : (estado.categorias[0] || {}).id },
      estado.categorias.map((c) => h('option', { value: c.id }, c.nombre)));
    const disponible = h('input', { type: 'checkbox' });
    disponible.checked = plato ? plato.disponible : true;

    return h('form', {
      class: 'formulario', novalidate: true,
      onsubmit: (ev) => {
        ev.preventDefault();
        const r = S.carta.guardarPlato({
          nombre: nombre.value, descripcion: descripcion.value, precio: precio.value,
          categoriaId: categoria.value, disponible: disponible.checked
        }, plato && plato.id);
        if (!r.ok) return zonaErrores.replaceChildren(S.errores(r.errores));
        cerrar();
        S.avisar(plato ? 'Plato actualizado' : 'Plato creado');
        S.refrescar();
      }
    },
      zonaErrores,
      S.campo('Nombre', nombre),
      S.campo('Descripción', descripcion, 'Opcional. Máximo 140 caracteres.'),
      h('div', { class: 'fila-campos' }, S.campo('Precio en pesos', precio), S.campo('Categoría', categoria)),
      h('label', { class: 'casilla' }, disponible, ' Disponible hoy'),
      h('div', { class: 'acciones' },
        h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar }, 'Cancelar'),
        h('button', { class: 'boton boton--principal', type: 'submit' }, plato ? 'Guardar cambios' : 'Crear plato')));
  }

  function formularioCategoria(categoria, cerrar) {
    const zonaErrores = h('div');
    const nombre = h('input', { type: 'text', maxlength: '30', required: true, value: categoria ? categoria.nombre : '' });
    return h('form', {
      class: 'formulario', novalidate: true,
      onsubmit: (ev) => {
        ev.preventDefault();
        const r = S.carta.guardarCategoria(nombre.value, categoria && categoria.id);
        if (!r.ok) return zonaErrores.replaceChildren(S.errores(r.errores));
        cerrar();
        S.avisar(categoria ? 'Categoría actualizada' : 'Categoría creada');
        S.refrescar();
      }
    },
      zonaErrores,
      S.campo('Nombre de la categoría', nombre),
      h('div', { class: 'acciones' },
        h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar }, 'Cancelar'),
        h('button', { class: 'boton boton--principal', type: 'submit' }, categoria ? 'Guardar cambios' : 'Crear categoría')));
  }

  function intentar(resultado, mensajeOk) {
    if (!resultado.ok) return S.avisar(resultado.errores[0], 'error');
    S.avisar(mensajeOk);
    S.refrescar();
  }

  S.registrarVista({
    ruta: 'carta',
    titulo: 'Carta',
    resumen: 'Platos, precios y disponibilidad',
    roles: ['admin', 'mesero', 'cliente'],
    render(contenedor, usuario) {
      const edita = S.seguridad.puede(usuario, 'carta.editar');
      const estado = S.datos.leer();
      const grupos = S.carta.agrupada(estado, usuario.rol === 'cliente');

      contenedor.append(h('div', { class: 'cabecera' },
        h('h1', null, 'Carta'),
        edita ? h('div', { class: 'acciones' },
          h('button', { class: 'boton', type: 'button', onclick: () => S.dialogo('Nueva categoría', (c) => formularioCategoria(null, c)) }, 'Nueva categoría'),
          h('button', {
            class: 'boton boton--principal', type: 'button', disabled: !estado.categorias.length,
            onclick: () => S.dialogo('Nuevo plato', (c) => formularioPlato(null, c))
          }, 'Nuevo plato')) : null));

      if (!grupos.length) {
        contenedor.append(S.vacio(edita ? 'La carta está vacía. Crea una categoría y luego agrega platos.' : 'La carta no está disponible en este momento.'));
        return;
      }

      grupos.forEach(({ categoria, platos }) => {
        contenedor.append(h('section', { class: 'carta-grupo' },
          h('div', { class: 'carta-grupo__titulo' },
            h('h2', null, categoria.nombre),
            edita ? h('span', null,
              h('button', { class: 'boton boton--plano boton--chico', type: 'button', onclick: () => S.dialogo('Editar categoría', (c) => formularioCategoria(categoria, c)) }, 'Renombrar'), ' ',
              h('button', {
                class: 'boton boton--plano boton--chico', type: 'button',
                onclick: () => S.confirmar('¿Eliminar la categoría "' + categoria.nombre + '"?', 'Eliminar categoría',
                  () => intentar(S.carta.eliminarCategoria(categoria.id), 'Categoría eliminada'))
              }, 'Eliminar')) : null),
          platos.length ? h('ul', { class: 'carta-lista' }, platos.map((p) =>
            h('li', { class: 'plato' + (p.disponible ? '' : ' plato--agotado') },
              h('div', { class: 'plato__texto' },
                h('h3', null, p.nombre, p.disponible ? null : h('span', { class: 'etiqueta etiqueta--alerta' }, 'Agotado')),
                p.descripcion ? h('p', null, p.descripcion) : null),
              h('div', { class: 'plato__precio' }, S.dinero(p.precio)),
              edita ? h('div', { class: 'plato__acciones' },
                h('button', {
                  class: 'boton boton--plano boton--chico', type: 'button',
                  onclick: () => { S.carta.cambiarDisponibilidad(p.id, !p.disponible); S.refrescar(); }
                }, p.disponible ? 'Marcar agotado' : 'Marcar disponible'),
                h('button', { class: 'boton boton--plano boton--chico', type: 'button', onclick: () => S.dialogo('Editar plato', (c) => formularioPlato(p, c)) }, 'Editar'),
                h('button', {
                  class: 'boton boton--plano boton--chico', type: 'button',
                  onclick: () => S.confirmar('¿Eliminar "' + p.nombre + '" de la carta? Los pedidos ya tomados no cambian.', 'Eliminar plato',
                    () => intentar(S.carta.eliminarPlato(p.id), 'Plato eliminado'))
                }, 'Eliminar')) : null)))
            : h('p', { class: 'nota' }, 'Sin platos en esta categoría.')));
      });
    }
  });
})(window.SIGR);
