# Frontend

Interfaz React con Vite. En la etapa 1, `src/app/App.jsx` muestra una pantalla de inicio con conexión, carga, error y reintento. Los módulos funcionales de abajo siguen pendientes; no hay botones que simulen operaciones implementadas.

| Módulo | Pantallas previstas |
|---|---|
| [Acceso](src/features/acceso/README.md) | Login y navegación según rol. |
| [Catálogo](src/features/catalogo/README.md) | Productos, categorías, proveedores y formularios del dueño. |
| [Inventario](src/features/inventario/README.md) | Registro de movimientos, ajustes e historial. |
| [Reposición](src/features/reposicion/README.md) | Alertas y lista editable, copiable y exportable. |

`src/app/` contiene la pantalla y estilos iniciales; `src/components/` queda disponible para componentes compartidos. `src/services/api.js` realiza la consulta HTTP. En desarrollo, Vite redirige `/api` al servidor local. Para hosting separado se configura `VITE_API_URL` antes de compilar; nunca se colocan secretos en variables `VITE_*`.

Ejecutar `npm run dev` desde la raíz inicia ambos servidores. `npm run build` genera el cliente Prisma y compila la interfaz en `frontend/dist`. Ver [instalación](../README.md#instalación-y-ejecución). La autorización por rol llegará en la etapa 2 y se comprobará en el backend.

Diseño completo: [módulos y estructura](../docs/segunda_entrega/04-modulos.md).
