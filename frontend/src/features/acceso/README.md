# Acceso

Login, cierre de sesión y navegación según el rol (RF-01 y RF-02, etapa 2). No ofrece registro público ni recuperación de contraseña.

| Archivo | Qué hace |
|---|---|
| `LoginPage.jsx` | Formulario de correo y contraseña. Evita doble envío y muestra el mensaje del servidor. |
| `Panel.jsx` | Datos de la sesión, menú del rol y secciones. Al cambiar de sección vuelve a consultar la sesión: si el backend responde 401, se vuelve al login. |
| `secciones.js` | Qué secciones ve el dueño y cuáles el empleado. Ocultar una sección no es seguridad: el backend controla cada operación. |
| `token-guardado.js` | Guarda el token en `sessionStorage`: dura mientras la pestaña esté abierta y se borra al cerrar sesión. |

El estado general de la sesión (verificando, sin sesión, autenticado, sin conexión) está en [`src/app/App.jsx`](../../app/App.jsx). Explicación y pruebas: [etapa 2](../../../../docs/implementacion/etapa-2.md).
