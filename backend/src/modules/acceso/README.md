# Acceso y permisos

Implementa RF-01 y RF-02 (etapa 2): login, validación del token y autorización por rol y comercio. No incluye registro público, recuperación de contraseña ni ABM de usuarios.

| Archivo | Qué hace |
|---|---|
| `acceso.routes.js` | `POST /api/auth/login` y `GET /api/auth/sesion`. Cerrar sesión no tiene ruta: el navegador borra el token. |
| `acceso.service.js` | Valida credenciales con bcrypt. Correo inexistente, contraseña incorrecta y cuenta inactiva reciben el mismo mensaje. |
| `token.js` | Firma y verifica el JWT (HS256). El token solo lleva el ID del usuario y su vencimiento. |
| `comercio.js` | `delComercio` y `buscarDelComercio`: filtran por el comercio autenticado (RN-01). |
| `../../middlewares/autenticacion.js` | `requireAuth` consulta al usuario en la base en cada solicitud (RN-15); `requireRole` controla el rol. |

Uso previsto en los módulos siguientes:

```js
router.post('/categorias', requireAuth(deps), requireRole('DUENO'), async (req, res) => {
  // req.auth = { usuarioId, rol, comercioId, usuario } leído de la base, nunca del body
});
const categoria = await buscarDelComercio(prisma.categoria, req.params.id, req.auth);
```

Explicación y pruebas: [etapa 2](../../../../docs/implementacion/etapa-2.md). Reglas: [RN-01 y RN-15](../../../../docs/segunda_entrega/02-reglas-de-negocio.md).
