# Verificación de las correcciones de la etapa 3

Verificación de Claude, coordinada por Nazareno. 10/11/2026.

Versión revisada: rama etapa-3-catalogo en 28b1acb, comparada con d8c97e2 (la versión de la revisión anterior). main (048fe4b) está en su historial. La rama se bajó del repositorio público a una copia aislada, y en esa copia no se modificó ningún archivo del proyecto.

Veredicto: lista para integrar a main. B1 y S1–S4 están resueltos y no encontré problemas nuevos que bloqueen la integración.

## Estado de cada observación
Obs.	Estado	Evidencia
B1 pantalla en blanco al volver a Productos	Resuelto	cambiarPestana vacía la lista y marca la carga en la misma actualización que cambia tipo, y .then ignora las respuestas canceladas. Mi reproducción original de Categorías → Productos ya no falla. En Chromium, con dueño y con empleado a 390 px, Categorías → Productos y Proveedores → Productos muestran los productos sin errores de JavaScript. Hice además un caso que no está en el script de Codex: la respuesta de Categorías demorada 1,5 s y la vuelta inmediata a Productos. La lista queda vacía mientras carga y después muestra solo productos: la respuesta vieja no se dibuja, la pestaña activa es Productos y la carga no queda trabada. El recorrido de crear categoría, después proveedor y después producto lo cubre el script de Codex, que ejecuté dos veces.
S1 la búsqueda persistía entre pestañas	Resuelto	Al cambiar de pestaña se reinician la búsqueda, el estado y la página. Probado así: buscar «zzz» en Productos, sin resultados, y pasar a Proveedores; el campo queda vacío y aparece el proveedor. Pulsar la pestaña que ya está activa no hace ninguna solicitud nueva.
S2 mensajes sin campo	Resuelto	Por la API: sin categoriaId responde 400 «Seleccioná categoría.»; con proveedorId vacío, 400 «Seleccioná proveedor.»; con mínimo «abc», 400 «Stock mínimo: …»; con inicial «0.0001», 400 «Stock inicial: …»; con un proveedor inactivo, 409 «El proveedor está inactivo…». Un ID inválido o de otro comercio sigue respondiendo 404 genérico. En pantalla, el mínimo «abc» muestra «Stock mínimo: …».
S3 pruebas que aceptaban cualquier error	Resuelto	database.test.js:178 exige 401 con INVALID_SESSION, y :180 exige ValidationError con el mensaje esperado. Además hay una prueba unitaria nueva y cinco casos HTTP nuevos que verifican el código y el mensaje. Un TypeError ya no las haría pasar.
S4 accesibilidad y títulos	Resuelto	getByRole('button', { name: 'Editar Papa' }) y 'Desactivar Papa' encuentran un botón cada uno. El formulario dice «Crear producto». No probé un lector de pantalla real.
## Permisos, aislamiento y atomicidad

El diff de catalogo.service.js solo cambia validaciones previas a la transacción y los mensajes de referencias inactivas. Las rutas, los bloqueos y el alta con movimiento siguen iguales. Lo comprobé por la API real:

El empleado que crea un producto o desactiva una categoría recibe 403.
Una categoría de otro comercio responde 404.
Si el cliente manda stockActual, responde 400.

La prueba de reversión del alta pasa con la verificación más estricta, y las 13 de integración pasan dos veces seguidas.

## Qué ejecuté

Linux, Node 24.22.1, npm 11.21.2, PostgreSQL 18.4 con bases nuevas creadas para esta verificación:

npm test: 31/31.
Integración: 13/13, dos veces, sobre stock_manager_test, exclusiva y vacía.
npm run build: correcto.
backend/tests/catalogo-browser.mjs dos veces seguidas, con PLAYWRIGHT_MODULE apuntando a la instalación del entorno y BROWSER_CHANNEL=chromium: los 8 pasos dieron OK. Antes de empezar, la base de pruebas estaba vacía; terminó vacía, porque el script la limpió.
Recorrido propio en Chromium con frontend, API y base de desarrollo reales (seed): lo que figura en la tabla.
## Qué leí y qué no verifiqué
Leí: el diff completo d8c97e2..28b1acb (código, pruebas, script de navegador y documentación), la sección de correcciones de etapa-3.md, el capítulo de la guía, la participación y la hoja de ruta. Los enlaces y las anclas de esos cuatro documentos están bien.
No verifiqué: Edge ni Windows (usé Chromium en Linux), prisma migrate deploy (en mi entorno apliqué el mismo migration.sql) ni un lector de pantalla real.
## Documentación

Describe el funcionamiento real y mantiene los pendientes: ensayo online, piloto y etapas 4 a 7. La explicación nueva sobre por qué la edición bloquea solo la referencia nueva es correcta. Tres detalles menores, ninguno bloqueante:

docs/implementacion/revision-etapa-3-claude.md perdió el formato Markdown (títulos, negritas y código aparecen como texto plano). El contenido es el mismo; se puede reemplazar por el archivo original.
En etapa-3.md, «limpia solo sus datos si la base estaba vacía» es impreciso: el script borra todas las filas de esas tablas al terminar. Es seguro porque exige empezar con la base vacía, pero conviene decirlo así.
Al integrar, actualizar los textos que dicen «falta la verificación de Claude» o «pendiente su verificación» en etapa-3.md, la guía, la participación y plan-desarrollo.md, y registrar el commit de integración.
