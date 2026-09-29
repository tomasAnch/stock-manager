# Frontend

Estructura inicial de la interfaz React del TFI. Se crean las carpetas de funcionalidades; las pantallas y las dependencias se incorporarán durante la implementación.

| Módulo | Pantallas previstas |
|---|---|
| [Acceso](src/features/acceso/README.md) | Login y navegación según rol. |
| [Catálogo](src/features/catalogo/README.md) | Productos, categorías, proveedores y formularios del dueño. |
| [Inventario](src/features/inventario/README.md) | Registro de movimientos, ajustes e historial. |
| [Reposición](src/features/reposicion/README.md) | Alertas y lista editable, copiable y exportable. |

`src/app/` alojará la configuración de la aplicación y la navegación; `src/components/`, componentes compartidos; `src/services/`, la comunicación HTTP con el backend. Sus `.gitkeep` permiten conservar las carpetas vacías en Git.

Todavía no hay una aplicación para ejecutar. Ocultar controles según el rol mejorará la interfaz, pero la autorización real corresponderá al backend.

Diseño completo: [módulos y estructura](../docs/segunda_entrega/04-modulos.md).
