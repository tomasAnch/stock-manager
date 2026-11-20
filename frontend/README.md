# Frontend

Interfaz React con Vite. [App.jsx](src/app/App.jsx) verifica la sesión al abrir la app y vuelve al login cuando la API la rechaza. El panel adapta el menú al rol y el backend comprueba los permisos de cada operación.

## Módulos

| Módulo | Funciones | Código |
|---|---|---|
| Acceso | Maneja el login y guarda el token en `sessionStorage`. El panel vuelve a consultar la sesión al cambiar de sección y ofrece reintentar si falla la conexión. | [Login](src/features/acceso/LoginPage.jsx) · [Panel](src/features/acceso/Panel.jsx) · [Almacenamiento del token](src/features/acceso/token-guardado.js) |
| Catálogo | Permite buscar y paginar productos, categorías y proveedores. El dueño administra los registros y los formularios envían las cantidades como cadenas decimales con punto. | [Pantalla de Catálogo](src/features/catalogo/Catalogo.jsx) |
| Inventario | Ofrece ingresos, salidas, ajustes según el rol e historial paginado, incluso de productos inactivos. Si falla la conexión durante un envío, pide consultar el historial antes de repetirlo. | [Pantalla de Inventario](src/features/inventario/Inventario.jsx) |
| Reposición | Muestra alertas y permite al dueño editar una lista temporal por proveedor, copiarla o exportarla en CSV. Si falla el portapapeles, ofrece el texto para copiar manualmente. | [Pantalla de Reposición](src/features/reposicion/Reposicion.jsx) · [Texto y CSV](src/features/reposicion/salidas.js) |

## Ejecución

El [cliente de la API](src/services/api.js) agrega el token a las solicitudes. En desarrollo, Vite redirige `/api` al servidor local. En producción, `VITE_API_URL` contiene la URL pública de la API al compilar.

Desde la raíz, `npm run dev` inicia ambos servidores y `npm run build` genera el cliente Prisma y compila la interfaz en `frontend/dist`. [Instalación del proyecto](../README.md#instalación-y-ejecución) · [Diseño de módulos](../docs/segunda_entrega/04-modulos.md)
