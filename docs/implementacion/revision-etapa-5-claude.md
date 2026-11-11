Revisión de la etapa 5 — Alertas y reposición
Rama: etapa-5-reposicion
Commit revisado: b9675f931c65447caee35e3237a1c68d0c960c19 (Tomás, 10/11/2026 21:38 -03:00)
Comparado contra: origin/main = cc4d42d6dba60990f458b258938923fa1512d62c. Es ancestro del commit revisado, así que la rama se puede integrar sin conflictos. Cambian 24 archivos.
Revisó: Claude, a pedido de Nazareno. No se modificó ningún archivo del proyecto ni se ejecutó ninguna acción de Git sobre la rama.
Veredicto

Lista para integrar. No encontré bloqueantes. Las cuatro observaciones de abajo son sugerencias: ninguna rompe una RF/RN ni produce datos incorrectos en la base. Quedan a criterio de Tomás y Codex. La etapa no se da por cerrada hasta que ustedes la aprueben e integren.

Bloqueantes

Ninguno.

Sugerencias
S1. El nombre del archivo CSV usa la fecha UTC y no la de Argentina
Archivo: frontend/src/features/reposicion/Reposicion.jsx:87, en calculadaEn.slice(0, 10).
Impacto: si la lista se calcula entre las 21:00 y las 23:59 de Argentina, el nombre del archivo muestra el día siguiente, pero la columna fecha_calculo muestra el día correcto. RN-14 no fija el nombre del archivo, así que no la incumple. Igual es una contradicción visible para el dueño, que podría archivar el pedido con la fecha equivocada.
Reproducción (a nivel de función): con calculadaEn = '2026-11-11T01:30:00.000Z':
el nombre queda reposicion-<id>-2026-11-11.csv;
fechaArgentina() devuelve 2026-11-10 22:30:00-03:00.
Solución propuesta: usar fechaArgentina(calculadaEn).slice(0, 10) para el nombre. Es un cambio de una línea. Opcionalmente, sumar un caso con una hora posterior a las 21:00 en reposicion.test.js.
S2. En UNIDAD, «1.000» o «1,000» se acepta como 1, no como mil
Archivos:
frontend/src/features/reposicion/salidas.js:3-6: la expresión regular acepta separador y decimales también para UNIDAD, y solo exige múltiplo de 1000 milésimas.
Reposicion.jsx:108: el mensaje dice «un entero positivo».
preparacion-defensa-oral.md:1532: la guía dice «sin separador de miles».
Impacto: en Argentina el punto se usa habitualmente como separador de miles. Un dueño que escribe 1.000 para pedir mil unidades obtiene un texto y un CSV con 1, sin ningún aviso. La entrada sigue mostrando 1.000, así que la diferencia se nota recién al leer la salida.
Reproducción: cantidadValida('1.000','UNIDAD') devuelve true, y formatearCantidad('1.000','UNIDAD') devuelve '1'. Lo mismo pasa con '1,000'.
Solución propuesta: para UNIDAD, aceptar solo dígitos (/^\d{1,9}$/), así el mensaje «entero positivo» pasa a ser literal. Para KG no hay forma de distinguir 1.000 de un decimal, y la regla de coma o punto decimal ya está documentada, así que no propongo cambiarla.
Nota: Inventario (etapa 4) acepta lo mismo, porque el backend lee 1.000 como 1 entero. No pido cambiarlo en esta etapa; lo dejo registrado por si quieren unificarlo después.
S3. El texto copiable dice «1 unidades»
Archivo: salidas.js:35, que siempre usa 'unidades'.
Impacto: es solo cosmético, pero es el texto que se pega en el mensaje al proveedor. En la etapa 4 ya se resolvió el singular y el plural (unidadVisible en Inventario.jsx:14).
Reproducción: crearTexto con una cantidad de '1' en UNIDAD produce 1 — A: 1 unidades.
Solución propuesta: usar «unidad» cuando la cantidad formateada sea 1. El CSV no cambia, porque su columna unidad lleva el código UNIDAD/KG.
S4. Precisión de la guía sobre el tipo que devuelve Prisma
Archivo: preparacion-defensa-oral.md:1516, que dice «Prisma entrega el resultado como cadena, por ejemplo "0.25"».
Impacto: $queryRaw devuelve un objeto Decimal. La conversión a texto la hace el servicio con .toString() (reposicion.service.js:19 y :36). Si en la defensa preguntan dónde se convierte, la guía apunta al lugar equivocado.
Solución propuesta: reemplazar la frase por «Prisma entrega un Decimal y el servicio lo convierte en texto con toString(), por ejemplo "0.25"».
Comprobación de los puntos pedidos
Punto	Resultado
1. Alertas	Correcto. La condición es p.activo AND p.stock_actual < p.stock_minimo, filtrada por comercio (reposicion.service.js:11-12). Lo reproduje por la API: igual al mínimo, mínimo cero, inactivo y producto de otro comercio no aparecen.
2. Permisos y comercio	Correcto. /alertas funciona para ambos roles; /lista tiene requireRole('DUENO'). Por llamada directa: empleado → 403, sin token → 401, empleado promovido en la base con el mismo token → 200, usuario desactivado con el mismo token → 401. Agregar ?comercioId= de otro comercio no trae datos ajenos.
3. Sugerencias	Correcto. Comprobé que objetivo menos saldo es exacto: el ejemplo de RN-13 con mínimo 5 = objetivo 5 da 2, 1.5 − 0.999 = 0.501 y el máximo da 999999999.999 sin notación exponencial. Agrupa por ID de proveedor, ordenado por nombre.
4. Lista temporal	Correcto por código y por la prueba del navegador: «Actualizar alertas» solo cambia alertas, mientras que recalcular o recargar reemplaza lista. La clave del Grupo incluye calculadaEn, así que reinicia avisos y copia manual. Salir de la sección desmonta el componente (Panel.jsx:62), así que lo que dice la guía en la línea 1507 coincide con el código.
5. Copia y CSV	Correcto. Ambos pasan por itemsSeleccionados y usan la fecha de calculadaEn. Antes y después de consultar por la API, productos y movimientos quedaron idénticos.
6. CSV según RN-14	Correcto: BOM, ;, coma decimal, KG con 3 decimales, CRLF también al final, escape de ;, " y saltos, y apóstrofo ante =, +, -, @ aunque haya espacios antes. Lo confirmé con bytes reales en la prueba del navegador y con una prueba propia de la función.
7. Interfaz	Sin problemas de comportamiento. Las acciones se bloquean mientras se consulta, hay grupo vacío, copia manual, falla de descarga, error con reintento de la última operación y vista móvil sin desborde (pasos 2 a 10 del recorrido). Solo las sugerencias S1 a S3.
8. Documentación	Es coherente con el código y comprensible para alguien sin experiencia: define GET, router, JOIN, Map, BigInt, Blob y snapshot antes de usarlos. Solo la imprecisión S4 y la frase de la línea 1532 relacionada con S2.
Qué leí
Todo el diff origin/main...b9675f9:
reposicion.routes.js y reposicion.service.js;
salidas.js y Reposicion.jsx;
los cambios en Panel.jsx, estilos y app.js;
las pruebas unitarias, de integración y reposicion-browser.mjs.
docs/implementacion/etapa-5.md.
RF-10 a RF-12, CU-07 y CU-08 (01-requerimientos.md), RN-12 a RN-14 (02-reglas-de-negocio.md) y las referencias en 04-modulos.md.
El capítulo de la etapa 5 completo en preparacion-defensa-oral.md (líneas 1445 en adelante).
Los cambios en la ficha de participación, el plan y el README.
Qué ejecuté (resultados reales, en el commit b9675f9)

Entorno: Linux, Node 24.22.1, npm 11 y PostgreSQL local nuevo creado solo para esta revisión. La base stock_manager_test es exclusiva, distinta de la de desarrollo, recién migrada y vacía. El navegador fue Chromium de Playwright (instalación externa, BROWSER_CHANNEL=chromium), no Edge.

Comando	Resultado
npm test	40/40
npm run test:integration, ejecutado como tsx --test tests/integration/database.test.js con NODE_ENV=test sobre la base de pruebas; ver la nota de abajo	24/24, repetido dos veces
npm run build (frontend)	Correcto (index-DaSr5pji.js, 252,64 kB)
node --import tsx backend/tests/reposicion-browser.mjs	10/10 pasos y limpieza de sus datos
node --import tsx backend/tests/inventario-browser.mjs (regresión de la etapa 4)	15/15 pasos
Prueba propia por la API (script fuera del repo; cargó sus datos en la base vacía y los borró al terminar)	Resultados en la tabla anterior. Las seis tablas quedaron vacías.
Prueba propia de salidas.js	Reprodujo S1, S2 y S3

Nota sobre la integración: en mi entorno, prisma migrate deploy no puede descargar el motor. Por eso apliqué el migration.sql del repositorio directamente y ejecuté el mismo archivo de pruebas que usa test:integration. No ejecuté literalmente el script npm run test:integration.

No se borraron datos preexistentes: la base empezó vacía, lo comprobó cada script, y terminó vacía.

Qué no verifiqué
Apertura del CSV en Excel o LibreOffice: solo revisé los bytes.
Edge y Windows: usé Chromium en Linux.
El portapapeles real del sistema operativo: la prueba controla la respuesta de navigator.clipboard.
La URL pública y un comercio piloto.
Que salir de la sección descarte las ediciones: lo deduje del código de Panel.jsx; no lo recorrí en el navegador fuera de lo que hace el script.
Los resultados que Codex registró en Windows: no los repetí en ese entorno, y lo de arriba es solo lo que ejecuté yo.