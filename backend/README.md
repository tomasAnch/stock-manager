# Backend

Estructura inicial del backend del TFI. En esta entrega se crean las carpetas y se define qué hará cada módulo; todavía no hay servidor ejecutable ni dependencias instaladas.

| Módulo | Responsabilidad |
|---|---|
| [Acceso](src/modules/acceso/README.md) | Sesión, usuario activo, rol y comercio. |
| [Catálogo](src/modules/catalogo/README.md) | Categorías, proveedores, productos y umbrales. |
| [Inventario](src/modules/inventario/README.md) | Movimientos, saldo e historial. |
| [Reposición](src/modules/reposicion/README.md) | Alertas y cantidades sugeridas por proveedor. |

`src/lib/` alojará el cliente compartido de Prisma; `src/middlewares/`, los controles de acceso y errores. `tests/` alojará las pruebas del backend. Los `.gitkeep` permiten conservar estos directorios vacíos en Git.

El backend se implementará con JavaScript, módulos ES, Express y tsx. Se fijarán versiones compatibles de Node.js, Prisma y tsx antes de instalar dependencias. Los futuros comandos `npm run dev` y `npm start` todavía no están disponibles.

El esquema vigente está en [docs/segunda_entrega/schema.prisma](../docs/segunda_entrega/schema.prisma). Al implementar se trasladará a `prisma/`, junto con el seed y las migraciones. Los CHECK de [restricciones.sql](../docs/segunda_entrega/restricciones.sql) deberán formar parte de la primera migración. Se evita mantener dos copias manuales del esquema.

Diseño completo: [módulos y secuencia de movimientos](../docs/segunda_entrega/04-modulos.md). Pruebas ya ejecutadas: [PostgreSQL](../docs/segunda_entrega/pruebas/README.md).
