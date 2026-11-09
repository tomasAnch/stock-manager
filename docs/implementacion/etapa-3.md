# Etapa 3 — Catálogo y alta con stock inicial

09/11/2026. Responsable: Tomás con Codex. Estado: implementada, pendiente de revisión de Nazareno con Claude. No integrada a main.

## Qué se implementó

RF-03 a RF-06. Categorías, proveedores y productos con alta, consulta, edición, baja lógica y reactivación. Búsqueda y filtros por actividad; páginas de 25 resultados. El dueño escribe y el empleado consulta. Todas las rutas consultan la sesión actual y limitan datos al comercio autenticado.

El producto muestra existencias, mínimos, objetivos, unidad, categoría y proveedor. El saldo no forma parte de la edición. El alta acepta stock inicial; si es positivo crea el movimiento con el usuario autenticado dentro de la misma transacción. Cero no crea movimiento.

No se agregaron tablas, migraciones ni dependencias. Se conserva el esquema aprobado. Las pantallas habituales de movimientos e historial corresponden a la etapa 4.

## Archivos y responsabilidades

- `backend/src/modules/catalogo/catalogo.routes.js`: endpoints, autenticación y autorización.
- `backend/src/modules/catalogo/catalogo.service.js`: normalización, validación, consultas, transacciones y bloqueos.
- `backend/src/modules/inventario/movimientos.service.js`: operación compartida que recibe una transacción; incrementa/decrementa y registra un movimiento. Sin rutas públicas todavía. La etapa 4 deberá envolverla en su transacción y probar sus endpoints.
- `frontend/src/features/catalogo/Catalogo.jsx`: listado, filtros, formularios y cambios de actividad. Se integra en Panel.
- `backend/tests/unit/catalogo.test.js` y casos añadidos a `backend/tests/integration/database.test.js`: reglas, HTTP y PostgreSQL.

## Contrato de API

Prefijo `/api/catalogo`. Recursos: `categorias`, `proveedores`, `productos`.

| Método y ruta | Uso |
|---|---|
| GET /recurso | Listar; `q`, `estado=activos/inactivos/todos`, `pagina` desde 1 |
| POST /recurso | Crear (dueño) |
| PUT /recurso/:id | Editar datos completos (dueño); conserva actividad y saldo |
| PATCH /recurso/:id/actividad | `{ "activo": true/false }` (dueño) |

Listado: `{ items, total, pagina, paginas }`. Cantidades como cadenas decimales con punto. Interfaz acepta coma y la convierte antes de enviar. Producto: código, nombre, unidad, categoriaId, proveedorId, stockMinimo, stockObjetivo; solo el alta admite stockInicial (por omisión cero). Categoría: nombre. Proveedor: nombre y contactos opcionales telefono/correo. Campos ajenos al contrato se rechazan; el cliente no puede asignarse otro comercio ni editar stockActual.

400: validación. 401: sesión inválida. 403: permiso. 404: ID inválido, inexistente o ajeno. 409: duplicado, regla de actividad/unidad o conflicto transaccional. No se reintentan automáticamente escrituras.

## Concurrencia e integridad

Prisma ejecuta transacciones interactivas. SQL parametrizado bloquea filas con `FOR UPDATE`; los nombres de tablas salen de una lista fija interna.

Producto existente: bloquear producto, categoría y proveedor, en ese orden. Alta: bloquear categoría y proveedor antes de crear. Baja de referencia: bloquear esa referencia y contar productos activos, sin bloquear después los productos. Así una asignación y una baja no pueden comprobar estados viejos y confirmar ambas.

La edición no cambia actividad; si un producto inactivo apunta a una referencia inactiva, primero se edita asignándole referencias activas y después se reactiva. También se puede reactivar la referencia original. Un producto con cualquier movimiento no cambia de unidad, aunque esté en cero.

Inventario bloquea el producto, valida actividad/unidad/cantidad/rango y usuario del mismo comercio; actualiza aritméticamente el saldo y crea el movimiento con el mismo cliente transaccional. Un egreso además exige saldo suficiente en el WHERE. El alta usa esta operación con STOCK_INICIAL habilitado solo internamente y para dueño. No debe habilitarse ese motivo en el futuro formulario habitual.

## Verificación ejecutada por Codex

Windows, Node 24.22.1, PostgreSQL local temporal en puerto 55435, base exclusiva stock_manager_test. No se cambió el .env ni se utilizó la base de desarrollo. La base temporal se limpia al terminar; solo se limpia si estaba vacía antes de comenzar.

- 30/30 pruebas unitarias y HTTP simuladas: [salida](resultados-etapa-3-unitarias.txt).
- 13/13 integración real: [salida](resultados-etapa-3-integracion.txt). Incluye seis casos nuevos agrupados de catálogo/inventario.
- Build de producción correcto: [salida](resultados-etapa-3-build.txt).
- Edge automatizado con frontend, API y PostgreSQL reales: [salida resumida del recorrido](resultados-etapa-3-navegador.txt). Alta en kg con coma decimal y movimiento inicial, rechazo del cambio de unidad con historial, baja/reactivación, categoría normalizada, empleado sin botones de escritura, móvil a 390 px sin desborde y sin excepciones JS. Se corrigieron etiquetas accesibles de selectores durante el recorrido.

La concurrencia se verificó con solicitudes de servicio simultáneas: alta contra baja de categoría/proveedor, y dos egresos de 3 sobre saldo 3. Solo uno confirma. Se comprobó rollback tras movimiento y reversión del alta cuando falla la identidad del responsable del ingreso inicial. Las pruebas HTTP verifican permisos en rutas reales, comercio ajeno y errores de datos.

No equivale a una auditoría exhaustiva: no se ensayó carga sostenida, despliegue ni un comercio piloto. La prueba de concurrencia cubre escenarios concretos, no todos los intercalados posibles. Las próximas etapas deben probar sus rutas propias. Falta revisión cruzada y recorrido personal del equipo.

## Recorrido manual para el equipo

1. Arrancar con las instrucciones del README y cuentas del seed local; entrar como dueño y abrir Catálogo.
2. Crear categoría y proveedor. Crear producto con unidad KG, mínimo 2, objetivo 5 e inicial 0,250.
3. Ver saldo 0.25. Intentar pasar a UNIDAD: se rechaza por historial.
4. Intentar desactivar su categoría: se rechaza mientras el producto esté activo.
5. Desactivar producto: desaparece del filtro activos. Buscar inactivos, editar o reactivar; conserva saldo.
6. Entrar como empleado: consultar, buscar y filtrar; no hay controles de escritura. La API también rechaza escritura aunque se envíe manualmente.

## Para la revisión de Claude

Revisar el orden de bloqueos, la atomicidad del alta, permisos de cada endpoint, edición de unidad y reasignación de referencias; repetir las pruebas sobre base exclusiva. No habilitar rutas de movimientos todavía. Explicación para estudiar en la guía raíz, capítulo etapa 3.
