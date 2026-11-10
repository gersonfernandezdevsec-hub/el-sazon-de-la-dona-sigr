'use strict';
window.SIGR = window.SIGR || {};
(function (S) {
  S.h = function (etiqueta, atributos, ...hijos) {
    const el = document.createElement(etiqueta);
    let valor;
    for (const [nombre, v] of Object.entries(atributos || {})) {
      if (v == null || v === false) continue;
      if (nombre === 'class') el.className = v;
      else if (nombre === 'value') valor = v;
      else if (nombre.startsWith('on')) el.addEventListener(nombre.slice(2), v);
      else el.setAttribute(nombre, v === true ? '' : v);
    }
    for (const hijo of hijos.flat(Infinity)) {
      if (hijo == null || hijo === false) continue;
      el.append(hijo.nodeType ? hijo : String(hijo));
    }
    if (valor !== undefined) el.value = valor;
    return el;
  };

  const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  S.dinero = (valor) => pesos.format(Math.round(valor || 0));

  const dosDigitos = (n) => String(n).padStart(2, '0');
  S.fechaISO = (ms) => {
    const d = new Date(ms);
    return d.getFullYear() + '-' + dosDigitos(d.getMonth() + 1) + '-' + dosDigitos(d.getDate());
  };
  S.horaCorta = (ms) => {
    const d = new Date(ms);
    return dosDigitos(d.getHours()) + ':' + dosDigitos(d.getMinutes());
  };
  S.fechaLarga = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  S.fechaHora = (ms) => S.fechaISO(ms) + ' ' + S.horaCorta(ms);

  S.avisar = function (texto, tipo) {
    const zona = document.getElementById('avisos');
    const aviso = S.h('div', { class: 'aviso aviso--' + (tipo || 'ok'), role: tipo === 'error' ? 'alert' : 'status' }, texto);
    zona.append(aviso);
    setTimeout(() => aviso.remove(), tipo === 'error' ? 6000 : 3500);
  };

  S.campo = function (etiqueta, control, ayuda) {
    return S.h('label', { class: 'campo' },
      S.h('span', { class: 'campo__etiqueta' }, etiqueta),
      control,
      ayuda ? S.h('span', { class: 'campo__ayuda' }, ayuda) : null);
  };

  S.errores = function (lista) {
    if (!lista || !lista.length) return null;
    return S.h('ul', { class: 'errores', role: 'alert' }, lista.map((e) => S.h('li', null, e)));
  };

  S.dialogo = function (titulo, contenido) {
    const dlg = S.h('dialog', { class: 'dialogo' });
    const cerrar = () => { dlg.close(); dlg.remove(); };
    dlg.append(
      S.h('div', { class: 'dialogo__cabecera' },
        S.h('h2', null, titulo),
        S.h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar, 'aria-label': 'Cerrar' }, 'Cerrar')),
      S.h('div', { class: 'dialogo__cuerpo' }, contenido(cerrar)));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    return cerrar;
  };

  S.confirmar = function (pregunta, textoBoton, alConfirmar) {
    S.dialogo('Confirmar', (cerrar) => [
      S.h('p', null, pregunta),
      S.h('div', { class: 'acciones' },
        S.h('button', { class: 'boton boton--plano', type: 'button', onclick: cerrar }, 'Cancelar'),
        S.h('button', { class: 'boton boton--peligro', type: 'button', onclick: () => { cerrar(); alConfirmar(); } }, textoBoton))
    ]);
  };

  S.vacio = function (texto, accion) {
    return S.h('div', { class: 'vacio' }, S.h('p', null, texto), accion || null);
  };

  S.vistas = [];
  S.registrarVista = function (vista) { S.vistas.push(vista); };
})(window.SIGR);
