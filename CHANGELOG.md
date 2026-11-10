# Historial de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). El proyecto usa versionado semántico.

## [1.0.0] - 2026-11-10

Línea base del sistema. Reúne los prototipos 0 a 6.

### Agregado

- **Prototipo 0.** Acceso con usuario y contraseña, registro de clientes, tres roles con permisos, contraseñas con PBKDF2-SHA256 y sal, bloqueo por intentos fallidos, cierre de sesión por inactividad, bitácora y política de seguridad de contenido.
- **Prototipo 1.** Carta digital con creación, edición y eliminación de platos y categorías, y marca de agotado.
- **Prototipo 2.** Pedidos con tablero de cuatro estados, detalle del pedido, asociación de cliente por teléfono, cancelación con motivo y alerta de demora en cocina.
- **Prototipo 3.** Reservas por fecha y hora con asignación automática de mesa, agenda diaria, marca de asistencia y alerta de retraso. El teléfono pasa a ser obligatorio y único para los clientes.
- **Prototipo 4.** Caja: cobro en efectivo con cálculo de cambio, tarjeta o transferencia; resumen del día; ventas de 7 días; cierre diario.
- **Prototipo 5.** Programa de clientes frecuentes: postre de regalo por cada $200.000 de consumo, tarjeta de sellos, canje desde el pedido y configuración por administración.
- **Prototipo 6.** Administración de cuentas del personal y vista de bitácora con filtro de alertas de seguridad.
- Documentación: casos de uso, diseño y experiencia de usuario, seguridad y definición de la línea base.
- 59 pruebas automáticas.

### Limitaciones conocidas

- Los datos viven en el navegador; no se comparten entre equipos.
- Cambiar el consumo requerido del programa recalcula los regalos de todos los clientes (ver RFC-001 en `docs/linea-base.md`).
