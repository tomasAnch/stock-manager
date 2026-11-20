# Backend

API REST con Express y Prisma. `GET /api/health` comprueba la conexión con PostgreSQL y responde 200 o 503.

## Módulos

| Módulo | Responsabilidad | Código |
|---|---|---|
| Acceso | `POST /api/auth/login` valida credenciales con bcrypt y emite un JWT. `GET /api/auth/sesion` consulta al usuario activo, su rol y su comercio. | [Rutas](src/modules/acceso/acceso.routes.js) · [JWT](src/modules/acceso/token.js) · [Filtro por comercio](src/modules/acceso/comercio.js) |
| Catálogo | Administra productos, categorías y proveedores. Ambos roles consultan datos de su comercio y el dueño puede crear, editar, dar de baja y reactivar registros. | [Rutas](src/modules/catalogo/catalogo.routes.js) · [Servicio](src/modules/catalogo/catalogo.service.js) |
| Inventario | `POST /api/inventario/movimientos` guarda el movimiento y el nuevo saldo en una transacción. El ajuste requiere rol de dueño y `GET /api/inventario/productos/:id/movimientos` devuelve el historial paginado. | [Rutas](src/modules/inventario/inventario.routes.js) · [Transacción](src/modules/inventario/movimientos.service.js) |
| Reposición | `GET /api/reposicion/alertas` muestra faltantes a ambos roles y `GET /api/reposicion/lista` calcula la lista para el dueño. La consulta agrupa por proveedor y propone la diferencia entre el stock objetivo y el actual. | [Rutas](src/modules/reposicion/reposicion.routes.js) · [Consulta](src/modules/reposicion/reposicion.service.js) |

El [middleware de autenticación](src/middlewares/autenticacion.js) verifica el JWT y consulta el rol y el comercio vigentes en cada solicitud protegida. El [manejador de errores](src/middlewares/error-handler.js) limita el diagnóstico al tipo, el código y ubicaciones controladas.

## Instalación y pruebas

El servidor se ejecuta con Node.js y tsx. Los comandos se lanzan desde la raíz siguiendo la [instalación del proyecto](../README.md#instalación-y-ejecución). El [esquema Prisma](prisma/schema.prisma) y la [migración inicial](prisma/migrations/202610280001_initial/migration.sql) definen el modelo operativo y sus siete CHECK. El seed carga datos ficticios de desarrollo con `ALLOW_DEMO_SEED=true` y queda bloqueado en producción.

Las [pruebas unitarias y de HTTP](tests/unit) cubren lógica y rutas. Las [pruebas de integración](tests/integration/database.test.js) usan una base exclusiva de PostgreSQL y comprueban permisos, concurrencia y saldos. [Secuencia de un movimiento](../docs/segunda_entrega/04-modulos.md#secuencia-de-registrar-un-movimiento) · [Evidencia SQL](../docs/segunda_entrega/pruebas/README.md)
