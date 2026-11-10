'use strict';
window.SIGR = window.SIGR || {};
(function (S) {
  const CLAVE = 'sigr.totuma.v1';

  S.ahora = () => Date.now();

  S.nuevoId = (prefijo) => prefijo + '-' + S.ahora().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

  function estadoInicial() {
    return {
      version: 1,
      usuarios: [],
      categorias: [],
      platos: [],
      mesas: [],
      pedidos: [],
      reservas: [],
      cierres: [],
      bitacora: [],
      config: {
        impoconsumo: 0.08,
        fidelizacion: { activa: true, umbral: 200000, platoRecompensaId: null }
      }
    };
  }

  S.datos = {
    leer() {
      try {
        const crudo = localStorage.getItem(CLAVE);
        if (!crudo) return estadoInicial();
        return Object.assign(estadoInicial(), JSON.parse(crudo));
      } catch (e) {
        return estadoInicial();
      }
    },

    guardar(cambio) {
      const estado = this.leer();
      const resultado = cambio(estado);
      localStorage.setItem(CLAVE, JSON.stringify(estado));
      return resultado;
    },

    borrarTodo() {
      localStorage.removeItem(CLAVE);
    },

    CLAVE
  };

  const CUENTAS_DEMO = [
    { nombre: 'Marta Rueda', usuario: 'admin', clave: 'Totuma2026*', rol: 'admin' },
    { nombre: 'Julián Pabón', usuario: 'mesero', clave: 'Mesero2026*', rol: 'mesero' },
    { nombre: 'Laura Ardila', usuario: 'cliente', clave: 'Cliente2026*', rol: 'cliente', telefono: '3005550101' }
  ];

  const MESAS_DEMO = [
    { id: 'mesa-1', nombre: 'Mesa 1', capacidad: 2 },
    { id: 'mesa-2', nombre: 'Mesa 2', capacidad: 2 },
    { id: 'mesa-3', nombre: 'Mesa 3', capacidad: 4 },
    { id: 'mesa-4', nombre: 'Mesa 4', capacidad: 4 },
    { id: 'mesa-5', nombre: 'Mesa 5', capacidad: 4 },
    { id: 'mesa-6', nombre: 'Mesa 6', capacidad: 6 },
    { id: 'mesa-7', nombre: 'Mesa 7', capacidad: 6 },
    { id: 'mesa-8', nombre: 'Mesa 8', capacidad: 8 }
  ];

  const CARTA_DEMO = [
    { categoria: 'Entradas', platos: [
      ['Arepa santandereana', 'De maíz pelado con chicharrón molido, asada en tiesto.', 6000],
      ['Hormigas culonas', 'Tostadas con sal. Porción para compartir.', 18000],
      ['Yuca frita con ají', 'Con ají de la casa.', 9000]
    ] },
    { categoria: 'Platos fuertes', platos: [
      ['Cabro con pepitoria', 'Cabro al horno con pepitoria, yuca y arepa.', 46000],
      ['Carne oreada', 'Res secada al sol y asada, con yuca y ají.', 38000],
      ['Mute santandereano', 'Sopa de maíz, callo, costilla y verduras.', 29000],
      ['Tamal santandereano', 'De maíz pelado con tres carnes y garbanzo.', 17000]
    ] },
    { categoria: 'Bebidas', platos: [
      ['Limonada de panela', 'Con limón mandarino.', 7000],
      ['Jugo de mora en agua', 'Fruta natural.', 8000],
      ['Refajo', 'Jarra pequeña.', 12000]
    ] },
    { categoria: 'Postres', platos: [
      ['Oblea con arequipe', 'Dos obleas con arequipe y queso rallado.', 9000],
      ['Bocadillo veleño con queso', 'Bocadillo de guayaba y queso fresco.', 8000],
      ['Dulce de apio y cidra', 'Receta de Floridablanca.', 8500]
    ] }
  ];

  S.sembrar = async function () {
    if (S.datos.leer().usuarios.length > 0) return false;

    const usuarios = [];
    for (const c of CUENTAS_DEMO) usuarios.push(await S.seguridad.construirUsuario(c));

    S.datos.guardar((e) => {
      e.usuarios = usuarios;
      e.mesas = MESAS_DEMO.map((m) => Object.assign({}, m));
      CARTA_DEMO.forEach((grupo, i) => {
        const categoriaId = 'cat-' + (i + 1);
        e.categorias.push({ id: categoriaId, nombre: grupo.categoria, orden: i + 1 });
        grupo.platos.forEach(([nombre, descripcion, precio], j) => {
          e.platos.push({ id: categoriaId + '-p' + (j + 1), categoriaId, nombre, descripcion, precio, disponible: true });
        });
      });
      e.config.fidelizacion.platoRecompensaId = 'cat-4-p1';
    });
    return true;
  };
})(window.SIGR);
