'use strict';
(function (S) {
  const limpiar = (t) => String(t == null ? '' : t).trim().replace(/\s+/g, ' ');

  function validarCategoria(nombre, categorias, idActual) {
    const errores = [];
    const n = limpiar(nombre);
    if (n.length < 3 || n.length > 30) errores.push('El nombre de la categoría debe tener entre 3 y 30 caracteres.');
    if (categorias.some((c) => c.id !== idActual && c.nombre.toLowerCase() === n.toLowerCase())) errores.push('Ya existe una categoría con ese nombre.');
    return errores;
  }

  function validarPlato(datos, estado, idActual) {
    const errores = [];
    const nombre = limpiar(datos.nombre);
    const precio = Number(datos.precio);
    if (nombre.length < 3 || nombre.length > 50) errores.push('El nombre del plato debe tener entre 3 y 50 caracteres.');
    if (limpiar(datos.descripcion).length > 140) errores.push('La descripción no puede pasar de 140 caracteres.');
    if (!Number.isInteger(precio) || precio < 500 || precio > 500000) errores.push('El precio debe ser un número entero entre $500 y $500.000.');
    if (!estado.categorias.some((c) => c.id === datos.categoriaId)) errores.push('Elige una categoría.');
    if (estado.platos.some((p) => p.id !== idActual && p.nombre.toLowerCase() === nombre.toLowerCase())) errores.push('Ya existe un plato con ese nombre.');
    return errores;
  }

  S.carta = {
    validarCategoria, validarPlato,

    agrupada(estado, soloDisponibles) {
      return estado.categorias.slice().sort((a, b) => a.orden - b.orden).map((c) => ({
        categoria: c,
        platos: estado.platos.filter((p) => p.categoriaId === c.id && (!soloDisponibles || p.disponible))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      })).filter((g) => !soloDisponibles || g.platos.length);
    },

    guardarCategoria(nombre, id) {
      S.seguridad.exigir('carta.editar');
      const errores = validarCategoria(nombre, S.datos.leer().categorias, id);
      if (errores.length) return { ok: false, errores };
      S.datos.guardar((e) => {
        if (id) e.categorias.find((c) => c.id === id).nombre = limpiar(nombre);
        else e.categorias.push({ id: S.nuevoId('cat'), nombre: limpiar(nombre), orden: e.categorias.length + 1 });
      });
      S.seguridad.registrar(id ? 'categoria.editada' : 'categoria.creada', limpiar(nombre));
      return { ok: true, errores: [] };
    },

    eliminarCategoria(id) {
      S.seguridad.exigir('carta.editar');
      const estado = S.datos.leer();
      const cantidad = estado.platos.filter((p) => p.categoriaId === id).length;
      if (cantidad) return { ok: false, errores: ['La categoría tiene ' + cantidad + ' plato(s). Muévelos o elimínalos primero.'] };
      const nombre = (estado.categorias.find((c) => c.id === id) || {}).nombre;
      S.datos.guardar((e) => { e.categorias = e.categorias.filter((c) => c.id !== id); });
      S.seguridad.registrar('categoria.eliminada', nombre);
      return { ok: true, errores: [] };
    },

    guardarPlato(datos, id) {
      S.seguridad.exigir('carta.editar');
      const errores = validarPlato(datos, S.datos.leer(), id);
      if (errores.length) return { ok: false, errores };
      const campos = {
        nombre: limpiar(datos.nombre), descripcion: limpiar(datos.descripcion),
        precio: Number(datos.precio), categoriaId: datos.categoriaId, disponible: datos.disponible !== false
      };
      S.datos.guardar((e) => {
        if (id) Object.assign(e.platos.find((p) => p.id === id), campos);
        else e.platos.push(Object.assign({ id: S.nuevoId('pla') }, campos));
      });
      S.seguridad.registrar(id ? 'plato.editado' : 'plato.creado', campos.nombre + ' ' + campos.precio);
      return { ok: true, errores: [] };
    },

    cambiarDisponibilidad(id, disponible) {
      S.seguridad.exigir('carta.editar');
      S.datos.guardar((e) => { e.platos.find((p) => p.id === id).disponible = !!disponible; });
      S.seguridad.registrar('plato.disponibilidad', id + ' ' + (disponible ? 'disponible' : 'agotado'));
    },

    eliminarPlato(id) {
      S.seguridad.exigir('carta.editar');
      const estado = S.datos.leer();
      if (estado.config.fidelizacion.platoRecompensaId === id) {
        return { ok: false, errores: ['Este plato es el regalo del programa de clientes frecuentes. Cambia el regalo antes de eliminarlo.'] };
      }
      const nombre = (estado.platos.find((p) => p.id === id) || {}).nombre;
      S.datos.guardar((e) => { e.platos = e.platos.filter((p) => p.id !== id); });
      S.seguridad.registrar('plato.eliminado', nombre);
      return { ok: true, errores: [] };
    }
  };
})(window.SIGR);
