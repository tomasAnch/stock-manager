# Inventario

Movimientos de stock e historial (etapa 4, RF-07 a RF-09).

| Archivo | Qué hace |
|---|---|
| `inventario.routes.js` | `POST /api/inventario/movimientos` y `GET /api/inventario/productos/:id/movimientos`. Ambas exigen sesión; el permiso de `AJUSTE` lo controla el servicio. No hay rutas para editar ni borrar movimientos. |
| `movimientos.service.js` | `validarSolicitud` revisa la forma del pedido; `registrarMovimiento(tx, auth, data, opciones)` es la única operación que cambia el saldo: bloquea el producto, valida, actualiza con aritmética de PostgreSQL e inserta el movimiento con el mismo cliente transaccional. `crearMovimiento` la usa para la API y `historial` lista movimientos paginados. |

Catálogo llama a `registrarMovimiento` dentro del alta para `STOCK_INICIAL` (con `permitirInicial`). La API habitual nunca acepta ese motivo.

Explicación completa: [etapa 4](../../../../docs/implementacion/etapa-4.md).
