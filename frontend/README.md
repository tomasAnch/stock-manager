# Frontend

Interfaz React con Vite. `src/app/App.jsx` maneja la sesión: muestra el login, verifica un token guardado al abrir la página y vuelve al login si la API rechaza la sesión. Después del login, el panel muestra el menú del rol. Las secciones de catálogo, inventario y reposición indican su etapa pendiente; no hay botones que simulen operaciones no implementadas.

| Módulo | Pantallas previstas |
|---|---|
| [Acceso](src/features/acceso/README.md) | Login y navegación según rol. Implementado en la etapa 2. |
| [Catálogo](src/features/catalogo/README.md) | Productos, categorías, proveedores y formularios del dueño. |
| [Inventario](src/features/inventario/README.md) | Registro de movimientos, ajustes e historial. |
| [Reposición](src/features/reposicion/README.md) | Alertas y lista editable, copiable y exportable. |

`src/app/` contiene el manejo de la sesión y los estilos; `src/components/` los componentes compartidos. `src/services/api.js` centraliza las consultas HTTP y agrega el token. En desarrollo, Vite redirige `/api` al servidor local. Para hosting separado se configura `VITE_API_URL` antes de compilar; nunca se colocan secretos en variables `VITE_*`.

Ejecutar `npm run dev` desde la raíz inicia ambos servidores. `npm run build` genera el cliente Prisma y compila la interfaz en `frontend/dist`. Ver [instalación](../README.md#instalación-y-ejecución). Ocultar una sección según el rol es solo comodidad: la autorización la comprueba el backend.

Diseño completo: [módulos y estructura](../docs/segunda_entrega/04-modulos.md).
