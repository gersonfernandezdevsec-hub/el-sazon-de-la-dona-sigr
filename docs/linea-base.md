# Línea base 1.0.0

## Qué es

La línea base es la primera versión estable y aprobada del sistema. A partir de ella, cualquier modificación se trata como un cambio controlado: se solicita, se evalúa, se aprueba y se verifica antes de integrarla. Sirve de punto de comparación para saber qué cambió, cuándo y por qué.

## Identificación

| Dato | Valor |
|---|---|
| Sistema | La Totuma: Sistema Integral de Gestión de Restaurante (SIGR) |
| Versión | 1.0.0 |
| Herramienta de control de versiones | Git, alojado en GitHub |
| Rama estable | `main` |
| Etiqueta | `v1.0.0` |
| Commits incluidos | Desde "Prototipo 0" hasta el commit marcado con la etiqueta `v1.0.0` |

El hash exacto del commit de la línea base se consulta con `git rev-parse v1.0.0`.

## Elementos de configuración incluidos

| Elemento | Ubicación | Descripción |
|---|---|---|
| Acceso y seguridad | `js/seguridad.js`, `js/vistas/acceso.js` | Cuentas, contraseñas cifradas, sesión, permisos por rol |
| Carta digital | `js/logica/carta.js`, `js/vistas/carta.js` | CRUD de platos y categorías |
| Pedidos | `js/logica/pedidos.js`, `js/vistas/pedidos.js` | Tablero y seguimiento por estados |
| Reservas | `js/logica/reservas.js`, `js/vistas/reservas.js` | Reserva por fecha y hora con asignación de mesa |
| Caja | `js/logica/caja.js`, `js/vistas/caja.js` | Cobro, reporte diario y cierre |
| Clientes frecuentes | `js/logica/fidelizacion.js`, `js/vistas/fidelizacion.js` | Postre de regalo por consumo acumulado |
| Equipo y bitácora | `js/vistas/equipo.js` | Cuentas del personal y auditoría |
| Datos | `js/datos.js` | Almacén y datos de demostración |
| Interfaz | `index.html`, `css/estilos.css`, `js/ui.js`, `js/app.js`, `img/` | Página, estilos y navegación |
| Pruebas | `pruebas/`, `probar.py` | 59 pruebas automáticas |
| Documentación | `README.md`, `CHANGELOG.md`, `LICENSE`, `docs/` | Uso, historial, licencia, casos de uso, diseño y seguridad |

## Criterios que se cumplieron para declararla

| Criterio | Evidencia |
|---|---|
| Todos los módulos cargan sin errores | La aplicación abre con `index.html` y cada sección responde |
| Las funciones críticas están operativas y validadas | 59 de 59 pruebas automáticas correctas (`python3 probar.py`) |
| Pruebas de integración básicas | Las pruebas de caja y fidelización recorren el flujo completo: pedido, cocina, entrega, cobro y regalo |
| Estructura de carpetas y convenciones definidas | Sección "Convenciones" de este documento y estructura en el README |
| Documentación mínima | README, CHANGELOG, LICENSE y la carpeta `docs/` |
| Control de acceso verificado | Cada módulo tiene al menos una prueba de permiso denegado |

## Convenciones

- **Idioma:** nombres de archivos, funciones, variables y mensajes en español.
- **Capas:** las reglas del negocio van en `js/logica/` y no tocan la página; las pantallas van en `js/vistas/` y no contienen reglas.
- **Seguridad:** toda operación que modifica datos llama a `S.seguridad.exigir(permiso)`; ningún texto escrito por una persona se inserta con `innerHTML`.
- **Resultados:** las operaciones devuelven `{ ok, errores }`; no lanzan errores por datos inválidos.
- **Pruebas:** cada regla nueva llega con su prueba en `pruebas/<módulo>.pruebas.js`.
- **Commits:** un commit por prototipo o por cambio aprobado; la primera línea dice qué se entrega.
- **Versiones:** versionado semántico. Correcciones suben el tercer número (1.0.1), funciones nuevas el segundo (1.1.0) y cambios incompatibles el primero (2.0.0).

## Cómo se cambia la línea base

1. **Solicitud (RFC).** Se abre un issue en GitHub con qué se pide, por qué y quién lo pide.
2. **Evaluación.** Se revisa el impacto técnico (archivos y pruebas afectadas), económico (tiempo) y funcional (qué cambia para cada rol).
3. **Decisión.** Se aprueba si está alineado con el objetivo del sistema y el riesgo es aceptable. Si se rechaza, queda la razón en el issue.
4. **Implementación.** En una rama aparte (`cambio/<número>-<nombre>`), con sus pruebas.
5. **Verificación.** Deben pasar todas las pruebas. Se integra a `main`, se actualiza el CHANGELOG y se crea una nueva etiqueta.

### Ejemplo: RFC-001

| Campo | Contenido |
|---|---|
| Título | Conservar los regalos ganados cuando cambia el consumo requerido |
| Tipo | Correctivo |
| Situación actual | Los regalos se calculan dividiendo el consumo total entre el valor vigente. Si administración sube el valor de $200.000 a $300.000, un cliente que ya había ganado un regalo puede dejar de tenerlo |
| Propuesta | Guardar cada regalo en el momento en que se gana, con el valor vigente ese día |
| Impacto técnico | `js/logica/fidelizacion.js`, `js/logica/caja.js` y sus pruebas; requiere migrar los datos existentes |
| Impacto funcional | El cliente nunca pierde un regalo ya ganado |
| Riesgo | Medio: cambia la forma de calcular el saldo |
| Estado | Pendiente de aprobación. Queda fuera de la línea base 1.0.0 y la pantalla advierte del recálculo |

## Validación y aprobación

| Dato | Valor |
|---|---|
| Fecha de creación | 10/11/2026 |
| Validado por | Gerson Gustavo Fernández Badillo (desarrollo y pruebas) |
| Responsable de aprobación | Gerson Gustavo Fernández Badillo |
