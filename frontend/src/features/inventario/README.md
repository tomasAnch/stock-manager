# Inventario

Pantalla de la etapa 4 (RF-07 a RF-09). `Inventario.jsx` tiene tres partes:

| Parte | Qué hace |
|---|---|
| Selector de productos | Usa `GET /api/catalogo/productos` con búsqueda, estado y paginación, así no se omiten productos después de la primera página. Los inactivos se pueden elegir solo para ver el historial. |
| Formulario de movimiento | Ofrece reposición y salida a ambos roles; el dueño ve además los ajustes. Muestra unidad y saldo, acepta coma o punto y envía la cantidad como texto con punto. Se deshabilita mientras hay una solicitud en curso. |
| Historial | `GET /api/inventario/productos/:id/movimientos`, del más reciente al más antiguo, 20 por página. |

Ocultar operaciones es solo comodidad: el backend vuelve a controlar rol, motivo, cantidad, saldo y comercio. Si la conexión falla al registrar, la pantalla no reintenta: pide revisar el historial, que se actualiza solo, antes de volver a cargar.

Explicación completa: [etapa 4](../../../../docs/implementacion/etapa-4.md).
