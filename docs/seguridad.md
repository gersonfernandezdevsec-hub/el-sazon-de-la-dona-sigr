# Seguridad

## Alcance

La línea base es una aplicación que corre completa en el navegador y guarda los datos en `localStorage`. Este documento describe los controles que sí están implementados y, con la misma claridad, lo que no puede garantizar una aplicación sin servidor.

## Controles implementados

| Riesgo | Control | Dónde está | Prueba |
|---|---|---|---|
| Robo de contraseñas guardadas | Se guarda solo el resultado de PBKDF2-SHA256 (100.000 iteraciones) con una sal aleatoria de 16 bytes por cuenta | `js/seguridad.js`, `derivar` | "La contraseña no se guarda en texto" |
| Contraseñas débiles | Mínimo 8 caracteres, con letras y números | `validarUsuario` | "Rechaza contraseñas débiles" |
| Adivinar contraseñas por fuerza bruta | Bloqueo de 5 minutos al quinto intento fallido | `iniciarSesion` | "Bloquea la cuenta al quinto intento" |
| Descubrir qué usuarios existen | El mensaje de error es idéntico si falla el usuario o la contraseña, y se hace el mismo cálculo en ambos casos | `iniciarSesion` | "El mensaje de error no revela si el usuario existe" |
| Sesión abierta en un equipo compartido | Cierre automático a los 15 minutos sin actividad; la sesión vive en `sessionStorage` y se borra al cerrar la pestaña | `usuarioActual`, `marcarActividad` | "La sesión se cierra tras 15 minutos" |
| Que un rol haga lo que no le corresponde | Tabla de permisos por rol; cada operación llama a `exigir()` antes de modificar datos, no solo se ocultan los botones | `PERMISOS`, `exigir` | Pruebas "no puede" de cada módulo |
| Que un cliente vea o cancele reservas ajenas | Las reservas se filtran por dueño y se valida el dueño al cancelar | `js/logica/reservas.js` | "Un cliente no puede cancelar la reserva de otra persona" |
| Inyección de código (XSS) | La interfaz nunca usa `innerHTML`: todo el texto pasa por `h()`, que crea nodos de texto | `js/ui.js` | "El texto con etiquetas HTML se guarda como texto" |
| Carga de scripts externos | Política de seguridad de contenido: solo archivos del propio proyecto, sin scripts ni estilos en línea | `index.html` | Revisión manual |
| Datos inválidos | Validación de tipos, rangos y longitudes en cada operación, independiente del formulario | `js/logica/*.js` | Pruebas "rechaza" de cada módulo |
| Escalar privilegios al registrarse | El registro público solo crea clientes; el personal lo crea administración | `acceso.js`, `crearPersonal` | "Solo administración crea personal" |
| Dejar el sistema sin administrador | Nadie puede desactivar su propia cuenta | `cambiarActivo` | "no se desactiva a sí mismo" |
| Negar una acción | Bitácora con fecha, persona, acción y detalle; incluye intentos fallidos y accesos denegados | `registrar` | "exigir() bloquea y deja rastro" |
| Abuso de reservas | Máximo dos reservas vigentes por cliente y 30 días de anticipación | `js/logica/reservas.js` | "El cliente tiene máximo dos reservas vigentes" |
| Fraude con regalos | Un regalo por pedido, solo lo agrega el personal, y el saldo se calcula de los pedidos pagados | `js/logica/fidelizacion.js` | Pruebas de fidelización |

## Límites de esta versión

Estos puntos no se pueden resolver sin un servidor y por eso quedan fuera de la línea base:

1. **Los datos están en el equipo.** Quien tenga acceso al navegador puede leer o modificar `localStorage` con las herramientas de desarrollo. Los controles de rol protegen el uso normal de la aplicación, no contra alguien con acceso técnico al equipo.
2. **No hay un único lugar de verdad.** Cada navegador tiene sus propios datos; dos equipos no comparten pedidos.
3. **El bloqueo por intentos es local.** Borrar los datos del navegador lo reinicia.
4. **Las cuentas de demostración son públicas.** Están en el README para poder evaluar el sistema.

## Qué cambia al pasar a producción

| Tema | En la línea base | En producción |
|---|---|---|
| Datos | `localStorage` | Base de datos en servidor, con copias de seguridad |
| Contraseñas | PBKDF2 en el navegador | Argon2id o bcrypt en el servidor |
| Sesión | `sessionStorage` | Cookie `HttpOnly`, `Secure`, `SameSite=Strict` |
| Permisos | Verificados en el navegador | Verificados en cada petición al servidor |
| Transporte | Archivo local o GitHub Pages | HTTPS obligatorio |
| Datos personales | Nombre y teléfono en el equipo | Tratamiento según la Ley 1581 de 2012: autorización, finalidad y derecho a eliminar los datos |

La lógica de cada módulo está separada de la interfaz (`js/logica/`), de modo que esas reglas se pueden mover a un servidor sin reescribirlas.
