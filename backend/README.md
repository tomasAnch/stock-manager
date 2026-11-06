# Backend

Backend ejecutable con Express y Prisma. `GET /api/health` consulta PostgreSQL y responde 200 o 503 sin devolver información del comercio. Desde la etapa 2 están `POST /api/auth/login` y `GET /api/auth/sesion`. Estado de cada módulo:

| Módulo | Responsabilidad |
|---|---|
| [Acceso](src/modules/acceso/README.md) | Sesión, usuario activo, rol y comercio. Implementado en la etapa 2. |
| [Catálogo](src/modules/catalogo/README.md) | Categorías, proveedores, productos y umbrales. |
| [Inventario](src/modules/inventario/README.md) | Movimientos, saldo e historial. |
| [Reposición](src/modules/reposicion/README.md) | Alertas y cantidades sugeridas por proveedor. |

`src/lib/` contiene configuración, cliente Prisma y validaciones de nombres/cantidades. El manejo general de errores está en `src/middlewares/error-handler.js` y registra solo tipo, código y ubicaciones controladas. `src/middlewares/autenticacion.js` contiene `requireAuth` (token + usuario activo leído de la base) y `requireRole`; `src/modules/acceso/comercio.js`, el filtro por comercio para los módulos siguientes. `tests/unit/` prueba lógica y HTTP; `tests/integration/` usa PostgreSQL real. CORS controla los orígenes admitidos por el navegador, pero no sustituye la autorización: esa la decide el backend en cada solicitud.

Se usa JavaScript con módulos ES y tsx, también en ejecución de producción. Node 24.22.1 y Prisma 7.10.1 son las versiones verificadas; las demás dependencias están fijadas en package.json y el lockfile raíz. La instalación y los comandos se ejecutan desde la raíz siguiendo el [README principal](../README.md#instalación-y-ejecución).

El esquema vigente está en [prisma/schema.prisma](prisma/schema.prisma). La copia documental de septiembre es histórica y no se sincroniza manualmente. La migración inicial ya incluye los siete CHECK: no ejecutar el SQL documental encima. El seed carga solo datos ficticios de desarrollo cuando se habilita ALLOW_DEMO_SEED=true; se rechaza en producción y no se ejecuta automáticamente al arrancar ni al migrar. El runner de integración inspecciona la base antes de aplicar migraciones; ver la recuperación de pruebas interrumpidas en el README principal.

Diseño completo: [módulos y secuencia de movimientos](../docs/segunda_entrega/04-modulos.md). Pruebas ya ejecutadas: [PostgreSQL](../docs/segunda_entrega/pruebas/README.md).
