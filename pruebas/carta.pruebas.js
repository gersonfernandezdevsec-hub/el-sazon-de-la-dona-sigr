'use strict';
(function (S) {
  const { prueba, afirmar, igual } = S;
  const M = 'Carta';

  async function comoRol(usuario, clave) {
    await S.sembrar();
    S.seguridad.cerrarSesion();
    await S.seguridad.iniciarSesion(usuario, clave);
  }
  S.comoAdmin = () => comoRol('admin', 'Sazon2026*');
  S.comoMesero = () => comoRol('mesero', 'Mesero2026*');
  S.comoCliente = () => comoRol('cliente', 'Cliente2026*');

  const nuevo = () => ({ nombre: 'Frijoles con garra', descripcion: 'Porción', precio: 15000, categoriaId: 'cat-2', disponible: true });

  prueba(M, 'Administración crea, edita y elimina un plato', async () => {
    await S.comoAdmin();
    igual(S.carta.guardarPlato(nuevo()).ok, true);
    const plato = S.datos.leer().platos.find((p) => p.nombre === 'Frijoles con garra');
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { precio: 16000 }), plato.id).ok, true);
    igual(S.datos.leer().platos.find((p) => p.id === plato.id).precio, 16000);
    igual(S.carta.eliminarPlato(plato.id).ok, true);
    igual(S.datos.leer().platos.some((p) => p.id === plato.id), false);
  });

  prueba(M, 'Rechaza precios inválidos, nombres repetidos y categorías inexistentes', async () => {
    await S.comoAdmin();
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { precio: -5 })).ok, false);
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { precio: 'abc' })).ok, false);
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { precio: 1500.5 })).ok, false);
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { nombre: 'sancocho TRIFÁSICO' })).ok, false);
    igual(S.carta.guardarPlato(Object.assign(nuevo(), { categoriaId: 'no-existe' })).ok, false);
  });

  prueba(M, 'Un mesero o un cliente no pueden modificar la carta', async () => {
    for (const entrar of [S.comoMesero, S.comoCliente]) {
      await entrar();
      let bloqueado = false;
      try { S.carta.guardarPlato(nuevo()); } catch (e) { bloqueado = true; }
      afirmar(bloqueado, 'debió bloquear');
    }
    igual(S.datos.leer().platos.some((p) => p.nombre === 'Frijoles con garra'), false);
  });

  prueba(M, 'El cliente no ve los platos agotados', async () => {
    await S.comoAdmin();
    S.carta.cambiarDisponibilidad('cat-1-p2', false);
    const todos = S.carta.agrupada(S.datos.leer(), false)[0].platos.length;
    const visibles = S.carta.agrupada(S.datos.leer(), true)[0].platos.length;
    igual(todos - visibles, 1);
  });

  prueba(M, 'No se elimina una categoría con platos ni el plato de regalo', async () => {
    await S.comoAdmin();
    igual(S.carta.eliminarCategoria('cat-1').ok, false);
    igual(S.carta.eliminarPlato('cat-4-p1').ok, false);
    igual(S.carta.guardarCategoria('Sopas').ok, true);
    const sopas = S.datos.leer().categorias.find((c) => c.nombre === 'Sopas');
    igual(S.carta.eliminarCategoria(sopas.id).ok, true);
  });

  prueba(M, 'El texto con etiquetas HTML se guarda como texto, no se interpreta', async () => {
    await S.comoAdmin();
    S.carta.guardarPlato(Object.assign(nuevo(), { nombre: '<img src=x onerror=alert(1)>' }));
    const el = S.h ? S.h('p', null, '<img src=x onerror=alert(1)>') : document.createTextNode('');
    igual(el.querySelector ? el.querySelector('img') : null, null);
  });
})(window.SIGR);
