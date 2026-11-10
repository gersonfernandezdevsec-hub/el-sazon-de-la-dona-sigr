# La Totuma: Sistema Integral de Gestión de Restaurante (SIGR)

Aplicación web para administrar un restaurante de cocina santandereana: carta, pedidos, reservas, caja y un programa de clientes frecuentes.

Proyecto académico de la asignatura Gestión del Software (Ingeniería de Software, Tecnológica del Oriente). Se desarrolla por prototipos sucesivos; cada prototipo queda en un commit.

## Cómo ejecutarlo

No requiere instalación ni servidor.

1. Descargar o clonar el repositorio.
2. Abrir `index.html` en Chrome, Edge, Firefox o Safari.

Los datos se guardan en el navegador (`localStorage`). La primera vez se cargan datos de demostración.

## Cuentas de prueba

| Rol | Usuario | Contraseña |
|---|---|---|
| Administración | `admin` | `Totuma2026*` |
| Mesero | `mesero` | `Mesero2026*` |
| Cliente | `cliente` | `Cliente2026*` |

Son cuentas de demostración. Cualquier persona puede crear además una cuenta de cliente desde la pantalla de acceso.

## Estado: prototipo 0

- Acceso con usuario y contraseña, y registro de clientes.
- Tres roles con permisos distintos: administración, mesero y cliente.
- Contraseñas cifradas (PBKDF2-SHA256 con sal), bloqueo tras 5 intentos fallidos y cierre de sesión por inactividad.
- Bitácora de acciones.

## Pruebas

Abrir `pruebas/pruebas.html` en el navegador, o desde la terminal en macOS con Chrome instalado:

```
python3 probar.py
```

## Estructura

```
index.html          Página única de la aplicación
css/estilos.css     Estilos
img/                Logo
js/datos.js         Almacén de datos y datos de demostración
js/seguridad.js     Contraseñas, sesión, permisos y bitácora
js/ui.js            Utilidades de interfaz
js/app.js           Arranque y navegación
js/vistas/          Una pantalla por archivo
pruebas/            Pruebas automáticas
probar.py           Ejecuta las pruebas desde la terminal
```
