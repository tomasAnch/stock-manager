# Etapa 4 — Movimientos e historial

10/11/2026 · Responsable: Nazareno, con Claude. Revisión: Tomás, con Codex. Estado: **cerrada: implementación y revisión cruzada aprobadas, integrada a `main` el 10/11 por Nazareno mediante fast-forward a `3b939c0` (no se creó commit de merge)**. Codex verificó la versión final `bc7465d`; `3b939c0` solo agrega el registro documental de esa aprobación. Parte de `main` en `b1b1b82` (etapa 3 cerrada), rama `etapa-4-inventario`. Referencias: RF-07 a RF-09, RN-01 y RN-04 a RN-11.

## Qué funciona

- **Reposición (ingreso) y salida (egreso)** para dueño y empleado, sobre productos activos de su comercio.
- **Ajuste de ingreso o de egreso** solo para el dueño, con observación obligatoria y no vacía. Corrige agregando un movimiento; no modifica los anteriores.
- **`STOCK_INICIAL`** sigue siendo exclusivo del alta de Catálogo: la API de movimientos lo rechaza con 400.
- **Cantidades exactas:** enteras en `UNIDAD`, hasta tres decimales en `KG`, siempre mayores a cero y dentro de `NUMERIC(12,3)`. Un ingreso que dejaría el saldo por encima de `999999999.999` se rechaza.
- **Saldo insuficiente y producto inactivo** se rechazan sin cambios (409).
- **Responsable, comercio y fecha** los pone el servidor: el usuario sale de la sesión verificada; la fecha, del reloj de PostgreSQL. El cliente no puede enviar `usuarioId`, `creadoEn`, `stockActual` ni `comercioId`.
- **Historial por producto** para ambos roles, incluidos productos inactivos. Muestra fecha, responsable (solo el nombre), tipo, motivo, cantidad, unidad y observación. Va del más reciente al más antiguo, con desempate por ID, 20 por página.
- **Pantalla de Inventario:** búsqueda y paginación de productos, unidad y saldo visibles, coma o punto decimal, envío bloqueado mientras hay una solicitud en curso (tampoco se puede elegir otro producto hasta recibir la respuesta), confirmación con el saldo nuevo, historial actualizado, errores que conservan lo escrito, estados de carga, vacío, sin conexión y sesión inválida.

No hay rutas para editar ni borrar movimientos, ni forma de escribir el saldo directamente.

## Qué queda pendiente

- **Ensayo de despliegue y piloto** (etapas 6 y 7).
- **Tiempo de carga (RNF-03):** se mide en el piloto; no se cronometró.
- **Alertas, reposición y CSV:** etapa 5.

## Archivos

| Archivo | Cambio |
|---|---|
| `backend/src/modules/inventario/movimientos.service.js` | `registrarMovimiento` revisada y reutilizada; nuevas `validarSolicitud`, `crearMovimiento` e `historial`. |
| `backend/src/modules/inventario/inventario.routes.js` | Nuevo. Rutas de la etapa. |
| `backend/src/app.js` | Monta `/api/inventario`. |
| `frontend/src/features/inventario/Inventario.jsx` | Nuevo. Pantalla completa. |
| `frontend/src/features/acceso/Panel.jsx` | Muestra Inventario en su sección. |
| `frontend/src/app/styles.css` | Estilos de Inventario. |
| `backend/tests/unit/inventario.test.js` | Nuevo. 5 pruebas de validación sin base de datos. |
| `backend/tests/integration/database.test.js` | 8 pruebas nuevas con PostgreSQL. |
| `backend/tests/inventario-browser.mjs` | Nuevo. Recorrido de navegador reproducible. |

Sin cambios de esquema, migraciones ni dependencias.

## Endpoints

| Ruta | Acceso | Respuesta |
|---|---|---|
| `POST /api/inventario/movimientos` | Sesión válida. `AJUSTE` solo dueño. | 201 `{ movimiento, producto }` con el saldo nuevo. |
| `GET /api/inventario/productos/:id/movimientos?pagina=N` | Sesión válida, ambos roles. | 200 `{ producto, items, total, pagina, paginas }`. |

Cuerpo del POST: `{ productoId, tipo, motivo, cantidad, observacion? }`. Cualquier otro campo se rechaza.

| Operación en pantalla | `tipo` | `motivo` | Roles |
|---|---|---|---|
| Reposición | `INGRESO` | `REPOSICION` | Dueño y empleado |
| Salida | `EGRESO` | `SALIDA` | Dueño y empleado |
| Ajuste: sumar stock | `INGRESO` | `AJUSTE` | Dueño (con observación) |
| Ajuste: restar stock | `EGRESO` | `AJUSTE` | Dueño (con observación) |

La pantalla elige productos con `GET /api/catalogo/productos` de la etapa 3, que ya filtra por comercio y pagina.

## Contrato de cantidades y errores

- La API recibe y devuelve cantidades como **texto con punto** (`"0.250"`), nunca como número de JavaScript, para no perder exactitud. La pantalla acepta coma y la convierte a punto antes de enviar.
- Los saldos vuelven como texto sin ceros de más (`"2.75"`, `"0"`).

| Código | Cuándo | Ejemplo de mensaje |
|---|---|---|
| 400 | Forma inválida, campos no permitidos, motivo inválido o `STOCK_INICIAL`, tipo y motivo incompatibles, cantidad inválida, ajuste sin observación, página inválida | «Cantidad: ingresá un número entero mayor a cero, de hasta 9 dígitos (por ejemplo 2).» |
| 401 | Sin sesión, sesión vencida o usuario desactivado | «La sesión ya no es válida…» |
| 403 | Empleado que intenta un ajuste | «Solo el dueño registra ajustes.» |
| 404 | Producto inexistente, con ID mal formado o de otro comercio (misma respuesta en los tres casos) | «No se encontró el producto.» |
| 409 | Saldo insuficiente, producto inactivo o conflicto de transacción | «No hay stock suficiente. Saldo disponible: 2 unidades.» |

El permiso del ajuste se informa antes que sus otros errores: un empleado recibe 403 aunque además falte la observación.

## Transacciones y concurrencia

`registrarMovimiento(tx, auth, data)` es la **única** operación que cambia el saldo. La usan el alta de Catálogo (para `STOCK_INICIAL`) y la API de esta etapa. Pasos, dentro de una transacción:

1. Validaciones que no necesitan la base: producto informado, tipo/motivo, permiso por rol, observación. Si fallan, no se consulta nada.
2. `SELECT … FOR UPDATE` del producto **del comercio autenticado**. Otro movimiento, una baja o un cambio de unidad del mismo producto esperan.
3. Con el bloqueo tomado se leen unidad, actividad y saldo vigentes; se valida la cantidad con esa unidad y que el usuario siga activo.
4. `updateMany` con `increment` o `decrement`, filtrando por ID, comercio y `activo = true`; el egreso agrega `stockActual >= cantidad`. Si no se modificó exactamente una fila, se lanza un error y se revierte.
5. Se inserta el movimiento con el mismo cliente transaccional, con el usuario leído de la base y `creadoEn = clock_timestamp()`.

**Decisiones:**

- **Fecha tomada después del bloqueo.** El valor por defecto de la columna (`now()`) es la hora de *inicio* de la transacción. Si un movimiento esperó el bloqueo, quedaría con una hora anterior a la de otro confirmado antes que él, y el historial mostraría un orden distinto al real. `clock_timestamp()` después del bloqueo acerca la fecha al momento en que el movimiento se aplica. No garantiza un orden estricto: la columna guarda milisegundos y dos movimientos pueden empatar; el desempate por ID es estable, pero no cronológico. Alternativa descartada: hora del servidor Node, porque mezcla dos relojes.
- **Orden de bloqueos:** esta operación bloquea solo el producto, que en el diseño va primero. No agrega esperas circulares con las operaciones de Catálogo.
- **Sin reintento automático.** Si se pierde la respuesta, la pantalla avisa que el resultado es incierto y recarga el historial para que la persona verifique antes de repetir.
- **Historial en una sola instantánea.** Saldo, página y total se leen en una transacción `REPEATABLE READ`, así corresponden al mismo momento.
- **Ocultar operaciones no es seguridad.** El empleado no ve los ajustes, pero el backend los rechaza igual si llegan por fuera de la pantalla.

## Pruebas y evidencias

Ejecutadas por Claude el 10/11 en una copia aislada (Linux, Node 24.22.1, PostgreSQL 18.4, bases nuevas). Salidas: [implementación](resultados-etapa-4-claude-2026-11-10.txt) y [correcciones de la revisión](resultados-etapa-4-correcciones-claude-2026-11-10.txt).

Nazareno repitió las pruebas automáticas en su equipo (Windows) el 10/11, con la etapa ya integrada en `main` (`a8fd447`): `npm test` 36/36 y `npm run test:integration` 21/21 ([salida](resultados-etapa-4-naza-2026-11-10.txt)). No ejecutó el recorrido de navegador.

| Prueba | Qué comprueba | Resultado |
|---|---|---|
| `npm test` | 36 pruebas. Las 5 nuevas de `inventario.test.js`: operaciones permitidas, `STOCK_INICIAL` y motivos desconocidos, combinaciones incompatibles, permiso de ajuste, campos que el cliente no puede enviar y que los rechazos previos no hagan consultas. | 36/36 |
| `npm run test:integration` | 21 pruebas, 8 nuevas, con PostgreSQL y la API real: roles y motivos; cantidades, rango, saldo insuficiente e inactivos; otro comercio con la misma respuesta que un ID inexistente; dos salidas simultáneas de 3 sobre saldo 3 (5 rondas); fallo real de la inserción después de descontar el saldo; coordinación con baja y cambio de unidad (con espera medida y carreras reales contra Catálogo); historial de 25 movimientos paginado y ordenado; conciliación de todos los saldos. | 21/21, dos veces |
| `npm run build` | Compilación del frontend. | Correcta |
| `backend/tests/inventario-browser.mjs` | 15 pasos con dueño y empleado (12 originales y 3 agregados por la revisión cruzada): salida con doble clic (una solicitud), saldo insuficiente, fracción en unidades, ajuste con y sin observación, kg con coma, falla de red, producto en la segunda página, búsqueda repetida, respuesta demorada con cambio rápido de producto, producto inactivo, Inventario ↔ Catálogo ↔ Inicio, sesión inválida, empleado con teclado y en móvil, envío en curso con respuesta demorada y con respuesta perdida después de confirmar (ambos roles), historial que falla, sin excepciones de JavaScript y saldos conciliados. | Claude: 12/12 antes de la revisión y 15/15 dos veces después de las correcciones (Chromium). Codex: 15/15 en Windows/Edge sobre `bc7465d` |
| Errores introducidos a propósito | Backend: quitar la condición de saldo, aceptar `STOCK_INICIAL`, permitir ajustes al empleado, quitar el bloqueo, quitar el filtro por comercio del historial, aceptar ajustes sin explicación. Pantalla: no repetir una búsqueda igual, no descartar un historial viejo, permitir envíos dobles; después de la revisión, la pantalla anterior, no bloquear el selector durante el envío y mostrar un historial fallido como vacío. | Cada uno hace fallar su prueba |

**Cómo se provoca el fallo entre saldo e inserción:** la prueba envuelve el cliente transaccional y cambia el responsable por un ID inexistente justo al insertar. PostgreSQL rechaza la clave foránea cuando el saldo ya fue descontado dentro de la transacción; la prueba confirma que adentro el saldo había bajado y que, después del rollback, quedó igual que antes y sin movimiento nuevo.

**Cómo correr el recorrido de navegador** (desde la raíz, con `DATABASE_URL` y `TEST_DATABASE_URL` distintas; la de pruebas exclusiva, vacía y migrada):

```bash
node --import tsx backend/tests/inventario-browser.mjs
```

Necesita Playwright y su navegador fuera del proyecto: `PLAYWRIGHT_MODULE` indica dónde está, y `BROWSER_CHANNEL=chromium` usa el Chromium de Playwright (por omisión, Edge). Si la base tiene datos, se detiene sin tocarla; al terminar borra las filas de las seis tablas, que creó él. No está incluido en `npm test`.

**Límites:** en el entorno de Claude no se puede descargar el motor de migraciones de Prisma; se aplicó el mismo `migration.sql` y se ejecutó el mismo archivo de pruebas. Claude no probó Edge ni Windows (Codex corrió los 12 pasos originales y, en la verificación final, los 15 en Windows/Edge), ni un lector de pantalla real. Si alguien cambia de sección del menú mientras se envía un movimiento, la pantalla de Inventario se cierra y no muestra la confirmación; el movimiento queda registrado y se ve en Catálogo y en el historial.

## Recorrido manual para el equipo

Con `npm run dev` y el seed cargado (el seed no crea productos):

1. Como dueño, en **Catálogo**, crear «Yerba» en unidades con stock inicial 3 y «Harina» en kg con 2,5.
2. En **Inventario**, buscar «yer», elegirla y registrar una **salida** de 1. Ver el aviso con saldo 2 y el movimiento arriba del historial.
3. Intentar una salida de 5: «No hay stock suficiente. Saldo disponible: 2 unidades.» La cantidad queda escrita.
4. Elegir **Ajuste: restar stock** sin observación (se rechaza) y con «Conteo físico» (se acepta).
5. Elegir «Harina» y registrar una **reposición** de `0,250`: saldo 2.75 kg.
6. Volver a **Catálogo** y comprobar el stock actual; volver a **Inventario**.
7. Cerrar sesión y entrar como **empleado**: solo ve reposición y salida; registrar una reposición y verla en el historial con su nombre.
8. Como dueño, desactivar «Yerba» en Catálogo. En Inventario, con el estado «Inactivos», elegirla: no hay formulario, pero sí historial.

## Revisión cruzada

Tomás revisó con Codex la versión `e463673` el 10/11. Según su informe: leyó servicio, rutas, pantalla, pruebas, recorrido, informe y guía; ejecutó 36/36, 21/21 con una base temporal vacía y la compilación; corrió los 12 pasos del navegador en Windows/Edge y reprodujo los casos de abajo. No encontró problemas en permisos, aislamiento ni transacciones, y confirmó que la prueba de fallo de inserción comprueba un rollback real. Los resultados de Codex no los repitió Claude; sí reprodujo B1 y S1 con las pruebas nuevas contra la pantalla anterior.

| Observación | Tipo | Resolución (10/11) | Verificación |
|---|---|---|---|
| **B1.** Si se elegía otro producto mientras se enviaba un movimiento, la respuesta volvía a mostrar el producto enviado; si la respuesta se perdía después de confirmar, el aviso de resultado incierto y la recarga del historial quedaban en el producto equivocado | Bloqueante | Mientras se envía, el selector, la búsqueda, el estado y la paginación quedan deshabilitados, con un aviso. Además, la respuesta y sus errores se aplican solo al producto enviado, y los mensajes lo nombran | Recorrido de navegador, con dueño y con empleado: respuesta exitosa demorada (el selector queda bloqueado y la confirmación sale en el producto enviado) y respuesta perdida después del commit (el aviso nombra el producto, su historial muestra el movimiento y el saldo se actualiza). Falla con la pantalla anterior y si se quita el bloqueo |
| **S1.** Un historial que fallaba al cargar mostraba a la vez el error y «Este producto todavía no tiene movimientos» | Sugerencia, aceptada | El estado vacío aparece solo después de una consulta exitosa del producto elegido. Si falla, se muestra el error con «Reintentar» | Paso nuevo del recorrido; falla si vuelven a mostrarse los dos mensajes |
| **S2.** El informe prometía que el orden por fecha coincide con el orden de aplicación | Sugerencia, aceptada | Se corrigió la redacción en este informe y en la guía: la fecha se toma después del bloqueo, pero puede haber empates de milisegundos y el desempate por ID no es cronológico | — |

**Verificación final.** Codex verificó `bc7465d` y aprobó las tres resoluciones. Según el informe compartido por Tomás: 36/36 pruebas unitarias; 21/21 de integración, con la migración aplicada sobre un PostgreSQL temporal vacío; compilación correcta; y los 15 pasos del recorrido en Windows/Edge con ambos roles, sin excepciones de JavaScript y con saldos conciliados. Son resultados informados por Codex: sus salidas no están guardadas en el repositorio.

## Para que revise Codex

1. `registrarMovimiento`: la fecha con `clock_timestamp()` después del bloqueo y el usuario tomado de la base. ¿Algún caso donde el alta con `STOCK_INICIAL` cambie de comportamiento?
2. Orden y mensajes de error: permiso antes que observación; 404 igual para inexistente, mal formado y ajeno.
3. `historial`: filtro por comercio en el producto y en los movimientos; lectura `REPEATABLE READ`; que no exponga datos de usuario de más.
4. La prueba de fallo con el cliente envuelto: ¿reproduce de verdad un fallo entre actualización e inserción?
5. `Inventario.jsx`: cancelación y descarte de respuestas viejas (dos protecciones), búsqueda repetida, resultado incierto ante falla de red, foco y etiquetas.
6. Que el recorrido de navegador cubra las transiciones entre secciones y que se pueda correr en Windows con Edge.
7. Correcciones de la revisión: que B1 quede resuelto también para el empleado y que el recorrido nuevo (15 pasos) pase en Windows/Edge.
