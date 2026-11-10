'use strict';
(function (S) {
  const pruebas = [];
  S.prueba = (modulo, nombre, fn) => pruebas.push({ modulo, nombre, fn });

  S.afirmar = function (condicion, mensaje) {
    if (!condicion) throw new Error(mensaje || 'La condición no se cumplió');
  };
  S.igual = function (obtenido, esperado, mensaje) {
    const a = JSON.stringify(obtenido), b = JSON.stringify(esperado);
    if (a !== b) throw new Error((mensaje ? mensaje + ': ' : '') + 'se esperaba ' + b + ' y se obtuvo ' + a);
  };

  S.fijarReloj = function (texto) {
    let t = new Date(texto).getTime();
    S.ahora = () => t;
    return { avanzar: (ms) => { t += ms; } };
  };

  S.ejecutarPruebas = async function () {
    const cuerpo = document.getElementById('resultados');
    let fallas = 0;
    for (const p of pruebas) {
      S.datos.borrarTodo();
      sessionStorage.clear();
      S.fijarReloj('2026-11-10T12:00:00');
      let resultado = 'OK';
      try { await p.fn(); } catch (e) { fallas += 1; resultado = 'FALLA: ' + e.message; }
      const fila = document.createElement('tr');
      [p.modulo, p.nombre, resultado].forEach((texto) => {
        const celda = document.createElement('td');
        celda.textContent = texto;
        fila.append(celda);
      });
      cuerpo.append(fila);
    }
    S.datos.borrarTodo();
    sessionStorage.clear();
    const resumen = 'PRUEBAS: ' + (pruebas.length - fallas) + ' de ' + pruebas.length + ' correctas' + (fallas ? ', ' + fallas + ' con falla' : '');
    document.getElementById('resumen').textContent = resumen;
    document.title = resumen;
  };
})(window.SIGR);
