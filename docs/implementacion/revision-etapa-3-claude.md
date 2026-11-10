# Revisión de la etapa 3 — Catálogo y alta con stock inicial

Revisión de Claude, coordinada por Nazareno. 09/11/2026.

## 1. Veredicto

Requiere correcciones. Hay un bloqueante en la interfaz; el backend, las transacciones y los permisos están bien.

Versión revisada: rama etapa-3-catalogo en d8c97e2, comparada con main en 048fe4b. Se bajó del repositorio público a una copia aislada; no se modificaron archivos del proyecto.

## 2. Hallazgos
### Bloqueante

B1. Volver a «Productos» desde «Categorías» o «Proveedores» deja la aplicación en blanco.

Archivo y línea: frontend/src/features/catalogo/Catalogo.jsx:66 (cambio de pestaña) y :94 (item.categoria.nombre).
Escenario: dueño o empleado abre Catálogo → pestaña Categorías (con al menos una categoría, como en el seed) → pestaña Productos. Pasa lo mismo desde Proveedores si el listado tiene algún proveedor.
Resultado actual: la pantalla queda vacía. La consola muestra Cannot read properties of undefined (reading 'nombre'). React desmonta toda la aplicación; solo se recupera recargando la página.
Causa: al cambiar de pestaña cambia tipo, pero lista y cargando conservan los datos de la pestaña anterior hasta que corre el efecto. En ese primer render se dibujan categorías con la plantilla de productos, que lee item.categoria.nombre.
Resultado esperado: se muestra «Cargando catálogo…» y después los productos.
Impacto: rompe un recorrido necesario para ambos roles. El recorrido manual de etapa-3.md (crear categoría y proveedor y después el producto) lleva exactamente a este error.
Corrección mínima: en el onClick de las pestañas, vaciar la lista y marcar la carga (setLista({ items: [], paginas: 1, total: 0 }); setCargando(true);). Otra opción es guardar el tipo junto con la lista y dibujarla solo si coincide. Conviene agregar ese paso (Categorías → Productos y Proveedores → Productos con datos) al recorrido de navegador.
Reproducción: Chromium con frontend, API y PostgreSQL reales; dueño y empleado; pantalla en blanco y el error de consola en los dos casos.
### Sugerencias

S1. La búsqueda se mantiene al cambiar de pestaña. Catalogo.jsx:66 no reinicia q ni busqueda. Si se busca «har» en Productos y se pasa a Proveedores, se muestran «0 registros» con el texto todavía en el campo. Conviene reiniciar la búsqueda al cambiar de pestaña, o dejar claro que el filtro sigue aplicado.

S2. Varios mensajes no dicen qué campo falló.

validation.js:27 y :31: «Cantidad inválida para la unidad.» o «La cantidad debe ser una cadena decimal…» no indican si es el inicial, el mínimo o el objetivo.
catalogo.service.js:64: «La categoría y el proveedor deben estar activos.» no indica cuál de los dos está inactivo.
catalogo.service.js:29-31: si falta categoriaId o proveedorId, la respuesta es 404 «No se encontró el registro.» en lugar de un 400 que nombre el campo.

En la pantalla se probó: mínimo «1,5» en UNIDAD y objetivo «abc». Corrección mínima: pasar el nombre del campo a parseQuantity y separar el mensaje de referencias. RNF-04 pide errores comprensibles.

S3. Pruebas que aceptan cualquier error. database.test.js:177 y :179 usan assert.rejects sin comprobar el tipo ni el código. Una falla inesperada (un 500 o un TypeError) también las haría pasar. Conviene verificar status o el mensaje esperado en cada caso.

S4. Botones repetidos sin contexto para lectores de pantalla. Cada tarjeta tiene «Editar» y «Desactivar»/«Reactivar» con el mismo nombre accesible. Corrección mínima: aria-label={\Editar ${item.nombre}`}`. El título del formulario dice «Crear productos» / «Editar categorías» en plural; es un detalle cosmético.

## 3. Qué leí, qué ejecuté y qué no verifiqué

Leí:

Diseño: plan-desarrollo.md (etapa 3), RF-03 a RF-06 y la matriz de permisos, RN-01 a RN-11, operaciones transaccionales de 03-modelo-de-datos.md y 04-modulos.md.
Implementación: catalogo.routes.js, catalogo.service.js, movimientos.service.js, app.js, validation.js, Catalogo.jsx, Panel.jsx y styles.css, más las pruebas nuevas.
Documentación de la etapa: etapa-3.md y sus cuatro evidencias, el capítulo de la guía, participacion-y-defensa.md y los README.

Comprobado y conforme, por lectura del código y con pruebas propias donde se indica:

Permisos: requireAuth en todo el router y requireRole('DUENO') en POST, PUT y PATCH, con el control repetido en el servicio. El empleado no ve controles de escritura y la API lo rechaza con 403.
Separación por comercio: el comercio sale de req.auth. datosEntrada rechaza comercioId, stockActual, activo y cualquier otro campo fuera del contrato. Las referencias de otro comercio responden 404.
Reglas de datos: códigos según RN-02, nombres según RN-03, duplicados también contra inactivos (409), cantidades según RN-04 (UNIDAD entera, KG con tres decimales, rango), objetivo ≥ mínimo, baja lógica que conserva el saldo, unidad estable si hay cualquier movimiento (RN-11).
Alta con stock inicial: se usa la misma tx. Un inicial cero no crea movimiento. STOCK_INICIAL solo se habilita desde el alta y para el dueño; no hay ruta de movimientos. El saldo se actualiza de forma aritmética y el movimiento queda a nombre del usuario autenticado, comprobado como activo y del mismo comercio. Si falla el movimiento después de crear el producto, se revierte todo.
Orden de bloqueos: producto (si existe) → categoría → proveedor, igual que el diseño. La baja de una referencia bloquea la referencia y cuenta productos sin bloquearlos. La edición bloquea solo la referencia nueva, no la anterior. Eso no produce inconsistencias: una baja concurrente de la referencia anterior todavía ve el producto asociado y se rechaza. No encontré ciclos de espera entre alta, edición, reactivación, baja de referencia y movimiento, porque todas toman los bloqueos en el mismo orden. Unidad y movimiento se coordinan sobre la fila del producto.

Ejecuté, en Linux con Node 24.22.1, npm 11.21.2 y PostgreSQL 18.4, sobre bases nuevas y vacías creadas para esta revisión:

npm test: 30/30.
Integración: 13/13 dos veces seguidas, sobre stock_manager_test, que es exclusiva y estaba vacía. La protección del before lo comprobó.
npm run build: correcto.
Navegador (Chromium), dueño: alta en kg con «0,250» y doble clic (una sola solicitud, saldo 0.25, movimiento inicial), código duplicado con el formulario conservado, cantidades inválidas, cambio de unidad con historial rechazado, red caída al guardar con el formulario conservado, búsqueda, 31 categorías disponibles en el formulario (más de una página) y reactivación rechazada con referencia inactiva, seguida de reasignación y reactivación con el saldo conservado.
Navegador, empleado y móvil: el empleado no ve botones de escritura; formulario y listado a 390 px sin desborde.
Concurrencia por la API real:
Mover un producto a una categoría mientras se da de baja esa categoría, 10 rondas: 10 de cada par aceptadas y 10 rechazadas con 409, sin productos activos con categoría inactiva.
Reactivar un producto mientras se da de baja su proveedor, 10 rondas: mismo resultado.
20 altas simultáneas con stock inicial en la misma categoría: 20 creadas.

No verifiqué:

prisma migrate deploy: en mi entorno no se puede descargar el motor de Prisma, así que apliqué el mismo migration.sql y ejecuté el mismo archivo de pruebas.
La combinación cambio de unidad + movimiento simultáneos: solo la razoné en el código, porque no hay ruta de movimientos.
Despliegue, carga sostenida, Windows/Edge y lectores de pantalla reales.
## 4. Resultados y límites de la evidencia

Los números de Codex (30/30, 13/13, build) coinciden con los míos. Su recorrido de navegador no detectó B1, probablemente porque no volvió a Productos con datos en otra pestaña. Las pruebas automáticas tampoco pueden detectarlo: no hay pruebas de componentes del frontend.

Las pruebas de concurrencia (las de Codex y las mías) cubren escenarios concretos; no demuestran todos los intercalados posibles. La garantía viene del razonamiento sobre el orden de bloqueos, y las pruebas lo respaldan.

## 5. Correcciones en la guía y la documentación
etapa-3.md, «Recorrido manual para el equipo», paso 2: hoy termina en la pantalla en blanco de B1. Después de corregir, repetir el recorrido y registrarlo.
etapa-3.md y la guía (línea 1190): dicen que el recorrido de navegador fue correcto. Después de corregir, agregar el paso entre pestañas y no presentar el recorrido anterior como completo.
Ubicación del capítulo: la etapa 3 quedó como subsección de «Etapas siguientes» y no figura en el índice. Ahora que está implementada, conviene darle su propia sección (como las etapas 1 y 2), agregarla al índice y registrar ahí la revisión cruzada cuando se cierre.
Detalle técnico: el fragmento de la guía es razonable como simplificación (ya lo aclara). Conviene agregar que la edición bloquea la referencia nueva y no la anterior, y por qué eso es seguro. Es una buena pregunta para el coloquio.

No encontré afirmaciones incorrectas sobre transacciones, permisos ni reglas. La guía separa bien lo que ejecutó Codex de lo que hizo Tomás.
