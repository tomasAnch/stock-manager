# Participación del equipo y preparación de la defensa

Acuerdo del 04/11/2026. Este registro acompaña la [hoja de ruta](plan-desarrollo.md). Se completa durante el trabajo, con aportes y resultados reales. Tener una etapa asignada no significa que ya esté realizada ni que su responsable haya escrito manualmente todo el código.

## Reparto acordado

La [guía de preparación de la defensa oral](../preparacion-defensa-oral.md), en la raíz, desarrolla las explicaciones para estudiar. Al cerrar cada etapa se completa tanto esa guía como la ficha de participación de este registro.

| Etapa | Responsable de llevarla adelante | Apoyo de IA | Revisión |
|---|---|---|---|
| 1. Entorno, base de datos y aplicación mínima | Tomás | Codex | Nazareno con Claude; terminada |
| 2. Acceso y permisos | Nazareno | Claude | Tomás con Codex |
| 3. Catálogo y alta con stock inicial | Tomás | Codex | Nazareno con Claude |
| 4. Movimientos e historial | Nazareno | Claude | Tomás con Codex |
| 5. Alertas y reposición | Tomás | Codex | Nazareno con Claude |
| 6. Verificación del conjunto y despliegue final | Ambos; tareas concretas por repartir antes de comenzar | Codex y Claude | Revisión cruzada |
| 7. Piloto, documentación y entrega | Ambos; tareas concretas por repartir antes de comenzar | Codex y Claude | Revisión cruzada |

La etapa 0 es la organización compartida. Ambos deben poder explicar el propósito del sistema y el recorrido general, aunque profundicen en sus partes.

## Cómo nos pasamos el trabajo

La implementación del código se hará con Codex y Claude, según el reparto. El integrante responsable coordina esa etapa, toma las decisiones que requieran al equipo y prepara su explicación; registra sus pruebas y revisiones personales cuando efectivamente las realice.

1. El responsable comienza desde la versión compartida que cerró la etapa anterior, siguiendo sus RF, RN y checklist.
2. Implementa con su asistente, prueba y completa la ficha de abajo. Registra también qué generó o revisó la IA y qué hizo él personalmente.
3. Comparte un commit identificable en el mismo repositorio. El compañero trae esa versión y la revisa con su asistente.
4. Se anotan observaciones, correcciones y pruebas repetidas. Una sugerencia puede descartarse, dejando el motivo; no hace falta aceptar todo automáticamente.
5. Se registra el resultado de la revisión y la versión final antes de iniciar la siguiente etapa. Evitamos que ambos asistentes modifiquen la misma etapa al mismo tiempo.

Los comandos de Git los ejecutan los integrantes. Este documento no asigna autoría por cantidad de commits ni convierte una prueba ejecutada por una IA en una prueba manual del estudiante.

## Qué hay que hacer en las etapas pendientes

Estas explicaciones resumen la [hoja de ruta técnica](plan-desarrollo.md), donde está la checklist completa. Antes de implementar, leer también los [requerimientos](segunda_entrega/01-requerimientos.md) y las [reglas de negocio](segunda_entrega/02-reglas-de-negocio.md). La etapa 2 está cerrada: su implementación y revisión local terminaron y se integró a `main` el 09/11; su ensayo de despliegue sigue pendiente. La etapa 3 está implementada y aprobada por revisión cruzada el 10/11 sobre 28b1acb, integrada a main el 10/11 en f88b617; etapa cerrada. La etapa 4 está cerrada e integrada a `main` (`3b939c0`); su despliegue sigue pendiente y va con la etapa 6. La etapa 5 está implementada por Codex para Tomás y probada localmente, pendiente de revisión de Nazareno con Claude e integración. Luego siguen las etapas 6 y 7.

### Etapa 2 — Acceso y permisos

**Lleva adelante:** Nazareno con Claude. **Revisan:** Tomás con Codex. Parte de la etapa 1 cerrada. Referencias: RF-01 y RF-02; RN-01 y RN-15.

- **Construir:** pantalla de login, cierre de sesión y navegación según dueño o empleado. En el servidor, comprobar la sesión/token, su vencimiento y que el usuario siga activo en cada solicitud protegida. Obtener rol y comercio desde el usuario consultado en la base, y preparar controles reutilizables para los módulos siguientes.
- **Probar:** contraseña incorrecta, acceso sin sesión, token vencido, usuario desactivado, permisos de otro rol y acceso a datos de otro comercio. Ocultar un botón no alcanza: el servidor también debe rechazar la operación.
- **Lista para revisión cuando:** ambos roles puedan entrar y salir, y las pruebas de la API demuestren los rechazos. Ensayar el despliegue del recorrido disponible si están las cuentas; registrar el bloqueo si faltan, sin frenar la lógica local.
- **Para la defensa:** explicar la diferencia entre identificar al usuario y decidir qué puede hacer; por qué un empleado no puede convertirse en dueño cambiando datos enviados desde el navegador.

### Etapa 3 — Catálogo y alta con stock inicial

**Lleva adelante:** Tomás con Codex. **Revisan:** Nazareno con Claude. Usa el acceso y permisos de la etapa 2. Referencias: RF-03 a RF-06; RN-02 a RN-05, RN-07 y RN-09 a RN-11.

- **Construir:** pantallas y operaciones para categorías, proveedores y productos: alta, consulta, búsqueda, edición, baja lógica y reactivación. El dueño administra; el empleado consulta. Cargar el stock inicial mediante una operación de inventario, guardando producto y movimiento en una misma transacción.
- **Probar:** códigos/nombres duplicados, normalización, cantidades inválidas, referencias inactivas o de otro comercio y permisos. Si falla el movimiento inicial, tampoco debe quedar el producto creado. Verificar la coordinación entre asignar referencias y darlas de baja.
- **Lista para revisión cuando:** se pueda mantener un catálogo desde la interfaz sin editar directamente el saldo ni el historial. Dejar preparada la operación de inventario que reutilizará la etapa 4.
- **Para la defensa:** explicar por qué se da de baja en vez de borrar, para qué sirve normalizar nombres y por qué el stock inicial también es un movimiento.

### Etapa 4 — Movimientos e historial

**Lleva adelante:** Nazareno con Claude. **Revisan:** Tomás con Codex. Reutiliza catálogo y operación transaccional de la etapa 3. Referencias: RF-07 a RF-09; RN-04 a RN-11.

- **Construir:** formularios de ingresos, salidas y ajustes; ajustes exclusivos del dueño con explicación obligatoria. Actualizar saldo y registrar el movimiento con el usuario autenticado dentro de la misma transacción. Mostrar historial por producto con paginación, incluidos productos inactivos.
- **Probar:** unidades enteras, fracciones de kg, cantidades y motivos inválidos, productos inactivos y dobles envíos. Con stock 3 y dos salidas simultáneas de 3, solo una debe confirmarse. Provocar un fallo entre actualización y registro para comprobar que se revierte todo; comparar saldo con historial y verificar la coordinación con baja/cambio de unidad.
- **Lista para revisión cuando:** los movimientos funcionen desde la pantalla y las pruebas reales en PostgreSQL demuestren que no dejan stock negativo ni registros a medias.
- **Para la defensa:** explicar una transacción con un ejemplo y cómo se evita que dos empleados retiren simultáneamente más mercadería que la disponible.

### Etapa 5 — Alertas y reposición

**Lleva adelante:** Tomás con Codex. **Revisan:** Nazareno con Claude. Usa los saldos actualizados de la etapa 4. Referencias: RF-10 a RF-12; RN-12 a RN-14.

- **Construir:** panel de productos activos con stock menor al mínimo. El dueño genera una lista por proveedor con cantidad sugerida igual a objetivo menos stock actual, puede editar cantidades y quitar ítems temporalmente, copiar texto o descargar CSV. El empleado puede consultar alertas.
- **Probar:** stock igual al mínimo, mínimo cero, lista vacía, cantidades por unidad/kg, permisos y recálculo. Copiar/exportar no modifica stock. Ambas salidas deben reflejar la lista editada; incluir copia manual alternativa. Verificar CSV con BOM UTF-8, separador `;`, coma decimal, fecha del cálculo, escape de campos y tratamiento de posibles fórmulas.
- **Lista para revisión cuando:** se puedan detectar faltantes y preparar la reposición con ambas salidas, sin guardar órdenes ni agregar seguimiento de compras.
- **Para la defensa:** explicar la diferencia entre mínimo y objetivo, por qué las alertas se calculan y por qué preparar una lista no registra un ingreso de mercadería.

### Etapa 6 — Verificación del conjunto y despliegue final

**Responsables:** ambos, con Codex y Claude. Repartir tareas concretas antes de empezar y anotarlas en la ficha. Integra las etapas 2 a 5.

- **Hacer:** recorrer login → alta → ingreso/salida → alerta → reposición → copia/CSV. Revisar escritorio, móvil, teclado, errores y estados de carga/vacíos. Ejecutar pruebas del conjunto, compilación e instalación desde cero.
- **Publicar y comprobar:** frontend, backend y base para poder usar la aplicación online; revisar HTTPS, orígenes permitidos, configuración y persistencia tras reiniciar. Elegir cuentas, servicios y costos con el equipo. No subir secretos. El requisito del campus es al menos un componente principal online; nuestra meta es que el recorrido completo sea accesible.
- **Lista para revisión cuando:** ambos puedan usar la URL real con los permisos previstos y haya instrucciones de instalación y recuperación. Las pruebas locales no sustituyen las del despliegue.
- **Para la defensa:** explicar dónde funciona cada componente, cómo se comunican y qué diferencia hay entre usar la app localmente y en internet.

### Etapa 7 — Piloto, documentación y entrega

**Responsables:** ambos, con Codex y Claude. Repartir tareas concretas antes de empezar. La coordinación del piloto y las notas de documentación se adelantan durante el desarrollo.

- **Hacer:** la semana de prueba con un comercio prevista en el proyecto, registrar problemas y tiempos reales y medir el objetivo de movimientos en menos de 10 segundos. Si no se consigue el piloto, consultar la alternativa con Sofía. Corregir lo encontrado y repetir las pruebas afectadas.
- **Preparar:** README y documentación actualizados, informe final, guion y video (preferentemente en inglés), y guía de defensa con frontend, backend, base y decisiones. Usar estas fichas para explicar los aportes reales de cada integrante y la asistencia de IA.
- **Terminada cuando:** estén la aplicación online, repositorio, informe y video revisados, y ambos puedan explicar el recorrido principal. Revisar enlaces y requisitos, compartir la entrega y avisar a la docente. La aprobación académica corresponde a Sofía/comité.
- **Para la defensa:** mostrar un caso completo, justificar las decisiones principales y contar resultados y límites reales del piloto.

## Ficha para completar al cerrar cada etapa

Copiar esta ficha para las etapas 2 a 7. Usar frases cortas y enlaces a los documentos existentes, sin duplicar las salidas de pruebas.

- **Etapa, fecha y estado:** pendiente / en desarrollo / en revisión / cerrada.
- **Responsable y revisor:** nombres de los integrantes.
- **Versión:** commit entregado a revisión y commit final, si cambió.
- **Qué quedó funcionando:** recorrido visible y requisitos cubiertos.
- **Aporte personal de cada integrante:** decisiones, configuración, pruebas manuales, revisión, correcciones o documentación que efectivamente realizó.
- **Asistencia de IA:** herramienta y tareas que generó, ejecutó o revisó.
- **Decisiones importantes:** qué se eligió, por qué y qué alternativa se descartó. Dos o tres decisiones relevantes alcanzan.
- **Pruebas y evidencia:** comando o recorrido, quién lo ejecutó, resultado, enlace y limitaciones pendientes.
- **Revisión cruzada:** problema señalado → resolución o motivo para descartarlo → verificación. Identificar quién revisó y el resultado final.
- **Para explicar en la defensa:** qué problema resuelve; recorrido pantalla → servidor → base; una regla de negocio y un caso de error, usando un ejemplo concreto.
- **Dudas por estudiar y siguiente paso:** dejar explícito lo que todavía no se puede explicar; no marcar comprensión sin comprobarla.

## Etapa 1 — Registro inicial

- **Estado:** cerrada tras revisión e instalación de Nazareno reportada el 30/10/2026.
- **Responsable:** Tomás, con implementación asistida por Codex. **Revisor:** Nazareno, con Claude.
- **Versión documentada:** `501810c`, identificada en la evidencia enviada por Nazareno. Los commits posteriores de documentación se completarán cuando se compartan; no se deducen del historial de conversación.
- **Resultado:** base ejecutable con React, Express, Prisma y PostgreSQL; pantalla de conexión, migración, seed y pruebas. Todavía sin login ni funciones de inventario.
- **Aporte registrado de Tomás:** coordinó el alcance de la etapa y las observaciones entre asistentes, ejecutó los comandos de Git y compartió el trabajo. La implementación y las comprobaciones locales detalladas fueron realizadas con Codex.
- **Aporte registrado de Nazareno:** coordinó la revisión con Claude y realizó la instalación en su equipo según el reporte enviado, aportando salida de terminal y captura. No se presume qué comandos escribió personalmente frente a cuáles ejecutó su asistente.
- **Decisiones documentadas:** base de pruebas separada de desarrollo; seed habilitado explícitamente y bloqueado en producción; diagnóstico de errores sin datos sensibles; conservación de la migración ya aplicada. Su explicación está en la [revisión de la etapa 1](implementacion/revision-etapa-1.md).
- **Pruebas:** 14 de lógica/HTTP y 5 de integración correctas, compilación y conexión. Ver [registro local](implementacion/revision-etapa-1.md), [salida de Nazareno](implementacion/instalacion-nazareno-2026-10-30.txt) y [captura](implementacion/instalacion-nazareno-2026-10-30.png). El TXT identifica los pasos cuya salida no se conservó.
- **Revisión cruzada:** observaciones sobre errores, seed, protección de pruebas, despliegue y legibilidad resueltas en la ronda del 29/10. El equipo comunicó el cierre tras la instalación de Nazareno.
- **Para practicar en la defensa:** explicar qué hace cada capa al mostrar «La conexión está lista», para qué sirve una migración, en qué se diferencia del seed y por qué las pruebas usan otra base.
- **Comprensión pendiente de practicar:** que ambos expliquen ese recorrido con sus palabras. La instalación correcta no acredita por sí sola esa comprensión.
- **Siguiente paso:** Nazareno y Claude implementan la etapa 2; Tomás y Codex revisan la versión compartida.

## Etapa 2 — Acceso y permisos

- **Estado:** cerrada. Implementada el 05/11/2026 y probada por Nazareno en su equipo. Revisada por Tomás con Codex el 06/11; correcciones aplicadas el 07/11 y aprobadas por Codex (comunicado por Tomás el 09/11). Nazareno la integró a `main` el 09/11. El ensayo de despliegue se registra por separado y sigue pendiente.
- **Responsable:** Nazareno, con implementación asistida por Claude. **Revisor:** Tomás, con Codex.
- **Versión:** parte de `41bf10a`; revisada sobre `e6f0ce4` y aprobada sobre `5ce7c91`, con las correcciones (rama `etapa-2-acceso`). Integrada a `main` en `51e1853`, que incluye también el capítulo de la guía de la defensa.
- **Qué quedó funcionando:** login, cierre de sesión, sesión que se revalida al recargar y al cambiar de sección, menú distinto para dueño y empleado, y controles `requireAuth`, `requireRole` y filtro por comercio listos para las etapas 3 a 5 (RF-01, RF-02, RN-01, RN-15). Detalle en [etapa 2](implementacion/etapa-2.md).
- **Asistencia de IA:** Claude escribió el código del backend y del frontend, las pruebas y la documentación de esta etapa, y ejecutó las pruebas automáticas, de integración y de navegador en una copia aislada. Las salidas están en [resultados de Claude](implementacion/resultados-etapa-2-claude-2026-11-05.txt).
- **Aporte personal de Nazareno:** pidió la implementación y la revisión con Claude. Agregó `JWT_SECRET` a su `.env`, ejecutó en su equipo `npm ci`, `npm run generate`, `npm test` (25/25) y `npm run test:integration` (7/7) (salida en [resultados de Nazareno](implementacion/resultados-etapa-2-naza-2026-11-05.txt)) y recorrió a mano el login, la recarga y el cierre de sesión con ambos roles.
- **Aporte personal de Tomás:** coordinó la revisión de la etapa con Codex, le compartió a Nazareno las observaciones del 06/11 y la aprobación final, y ejecutó los comandos de Git para traer a su equipo las versiones de la rama y la versión integrada en `main`. La lectura del código, las pruebas automatizadas y el recorrido en el navegador los ejecutó Codex.
- **Decisiones importantes:** rol y comercio leídos de la base en cada solicitud, no del token; token en el encabezado y en `sessionStorage` en lugar de cookie; mismo mensaje para cualquier credencial inválida. Motivos y alternativas en [etapa 2](implementacion/etapa-2.md#decisiones).
- **Pruebas y evidencia:** 05/11: 25/25 de lógica/HTTP, 7/7 de integración en dos ejecuciones y 11 pasos de navegador, ejecutados por Claude; en el equipo de Nazareno (Windows), 25/25 y 7/7, más el recorrido manual con ambos roles. 07/11, después de las correcciones: 26/26, 7/7 en dos ejecuciones y 7 pasos de navegador, ejecutados por Claude ([salida](implementacion/resultados-etapa-2-claude-2026-11-07.txt)). Verificación final de Codex informada por Tomás: 26/26, 7/7 y recorrido en navegador; sus salidas no están en el repositorio. 09/11, ya integrada en `main`: Nazareno repitió en su equipo 26/26 y 7/7 ([salida](implementacion/resultados-etapa-2-naza-2026-11-09.txt)).
- **Revisión cruzada:** Tomás revisó con Codex el 06/11: una observación bloqueante (el login aceptaba texto agregado después de los 72 bytes que compara bcrypt) y tres sugerencias (exigir el vencimiento del token, avisar los errores de conexión en el panel y no prometer tiempos idénticos en la documentación). Las cuatro se resolvieron el 07/11, cada una con su prueba, y Codex verificó las correcciones y aprobó integrar la etapa; detalle en [etapa 2](implementacion/etapa-2.md#revisión-cruzada).
- **Para explicar en la defensa:** la diferencia entre identificar (login, `requireAuth`) y autorizar (`requireRole`, filtro por comercio); por qué cambiar el rol en el navegador no sirve; el ejemplo del empleado desactivado con un token todavía vigente; el problema de los 72 bytes. Material de estudio en la [guía de la defensa](../preparacion-defensa-oral.md#etapa-2--problema-estado-y-alcance).
- **Comprensión pendiente de practicar:** que ambos expliquen con sus palabras el recorrido del login y el de una solicitud protegida, y completen la comprobación personal de la guía. No se marca como adquirida hasta practicarla.

## Etapa 3 — Catálogo (09/11/2026)

- Estado: implementada en etapa-3-catalogo; revisión cruzada aprobada el 10/11 sobre 28b1acb. Integrada a main el 10/11/2026 en f88b617; etapa cerrada.
- Responsable: Tomás con Codex. Revisión: Nazareno con Claude, realizada y aprobada el 10/11.
- Aporte registrado de Tomás: trajo la versión compartida, creó la rama y solicitó la implementación siguiendo la hoja de ruta.
- Asistencia de IA: Codex implementó backend/frontend, operación compartida de Inventario, pruebas y documentación. Ejecutó pruebas automatizadas y navegador; no son pruebas manuales de Tomás.
- Resultado: catálogo con permisos y aislamiento, altas con stock inicial atómico, bajas lógicas, reactivación y validaciones de unidad/referencias.
- Evidencias: [informe de implementación](implementacion/etapa-3.md), 30/30 unitarias, 13/13 integración, build y recorrido de navegador. Sin despliegue ni piloto.
- Para estudiar: capítulo etapa 3 de la guía raíz. Comprensión individual pendiente de practicar.
- Siguiente paso: Nazareno y Claude implementan la etapa 4 desde main actualizado; Tomás y Codex revisan.

### Revisión de etapa 3 — correcciones

Nazareno compartió la revisión de Claude sobre d8c97e2. Tomás la transmitió a Codex y coordinó la corrección. Codex corrigió B1 y S1-S4, reforzó pruebas y agregó un recorrido reproducible de navegador. El recorrido original no detectaba la vuelta entre pestañas; se documenta esa limitación. Claude aprobó las correcciones el 10/11 sobre 28b1acb. [Verificación final](implementacion/verificacion-etapa-3-claude.md). Ver [informe](implementacion/etapa-3.md#correcciones-después-de-la-revisión-cruzada-0911).


Tomás ejecutó el fast-forward y el push de la etapa 3 a main el 10/11/2026 (f88b617); compartió la salida y el estado limpio/sincronizado para registrar la integración. No se atribuyen nuevas pruebas manuales por ese paso.

## Etapa 4 — Movimientos e historial (10/11/2026)

- **Estado:** cerrada. Implementada el 10/11 (`e463673`), revisada por Tomás con Codex, corregida (`bc7465d`), aprobada por Codex e integrada a `main` el 10/11 por Nazareno mediante fast-forward a `3b939c0` (no se creó commit de merge).
- **Responsable y revisor:** Nazareno con Claude. Revisan Tomás con Codex.
- **Versión:** parte de `main` en `b1b1b82`; implementación `e463673`; correcciones `bc7465d`, versión aprobada; registro de la aprobación `3b939c0`, que es la versión a la que avanzó `main` (fast-forward, sin commit de merge).
- **Qué quedó funcionando:** reposición y salida para ambos roles, ajustes del dueño con explicación, historial paginado con productos inactivos y pantalla de Inventario (RF-07 a RF-09).
- **Aporte personal de Nazareno:** pidió la implementación con el alcance y las condiciones de trabajo, y creó la rama desde `main` actualizado. Hizo los commits y publicó la rama con la implementación (`e463673`) y con las correcciones (`bc7465d`), y coordinó con Tomás la revisión y la verificación. El 10/11, con la etapa ya integrada en `main` (`a8fd447`), ejecutó en su equipo `npm test` (36/36) y `npm run test:integration` (21/21) ([salida](implementacion/resultados-etapa-4-naza-2026-11-10.txt)). No consta que haya hecho el recorrido manual ni el de navegador.
- **Aporte personal de Tomás:** coordinó con Codex la revisión de `e463673` y la verificación de `bc7465d`, y compartió con Nazareno las observaciones y la aprobación. La lectura del código, las pruebas automáticas y los recorridos de navegador en Windows/Edge los ejecutó Codex.
- **Asistencia de IA:** Claude analizó el diseño y el código vigente, implementó backend, pantalla, pruebas, recorrido de navegador y documentación, y ejecutó todas las pruebas registradas hasta ahora en una copia aislada. No son pruebas manuales de los estudiantes.
- **Decisiones importantes:** una sola operación cambia el saldo, compartida con el alta; fecha del movimiento tomada del reloj de la base después del bloqueo, para que el historial refleje mejor el orden real (sin garantizar un orden estricto ante empates de milisegundos); sin reintento automático ante una respuesta perdida. Detalle en [etapa 4](implementacion/etapa-4.md#transacciones-y-concurrencia).
- **Pruebas y evidencia:** 36/36 unitarias, 21/21 de integración dos veces, compilación y 12 pasos de navegador con ambos roles, ejecutados por Claude ([salida](implementacion/resultados-etapa-4-claude-2026-11-10.txt)); después de las correcciones, 15 pasos de navegador dos veces ([salida](implementacion/resultados-etapa-4-correcciones-claude-2026-11-10.txt)). En la revisión, Codex informó 36/36, 21/21, compilación y los 12 pasos originales en Windows/Edge. En la verificación de `bc7465d`, Codex informó 36/36, 21/21 con migración sobre PostgreSQL temporal vacío, compilación y los 15 pasos en Windows/Edge con ambos roles, sin excepciones de JavaScript y con saldos conciliados (sus salidas no están en el repositorio). Nazareno repitió en su equipo, sobre `main`, 36/36 y 21/21 ([salida](implementacion/resultados-etapa-4-naza-2026-11-10.txt)).
- **Revisión cruzada:** Tomás revisó con Codex `e463673` el 10/11: un bloqueante (la respuesta de un envío podía aplicarse a otro producto elegido mientras tanto) y dos sugerencias (no mostrar como vacío un historial que falló; no prometer un orden cronológico estricto). Las tres se resolvieron el mismo día, con pruebas que fallan con la pantalla anterior; detalle en [etapa 4](implementacion/etapa-4.md#revisión-cruzada). Codex verificó `bc7465d` y aprobó las tres resoluciones.
- **Para explicar en la defensa:** cómo dos salidas simultáneas de 3 sobre saldo 3 terminan con una sola confirmada; qué es un rollback con el ejemplo de la inserción que falla; por qué un ajuste agrega un movimiento. Material en la [guía de la defensa](../preparacion-defensa-oral.md#etapa-4--movimientos-e-historial).
- **Comprensión pendiente de practicar:** ambos estudiantes; no se marca como adquirida hasta practicarla con las actividades de la guía.


## Etapa 5 — Alertas y reposición

- **Estado:** implementada y probada localmente el 10/11/2026 en `etapa-5-reposicion`; pendiente de revisión cruzada e integración.
- **Responsable y revisor:** Tomás con Codex; revisarán Nazareno con Claude.
- **Versión:** rama creada desde main actualizado (`cc4d42d`, informado por Tomás). El commit de revisión se registrará al compartirlo.
- **Resultado:** alertas para ambos roles; lista por proveedor para el dueño con sugerencias, edición, omisiones, copia y CSV. RF-10 a RF-12 y RN-12 a RN-14.
- **Aporte registrado de Tomás:** coordinó la etapa, actualizó el repositorio y creó la rama. Las pruebas y el código detallados aquí los ejecutó/escribió Codex; no se atribuyen como escritura manual ni recorridos personales de Tomás.
- **Aporte de Nazareno:** revisión pendiente; no se registra anticipadamente como realizada.
- **Asistencia de IA:** Codex implementó backend/frontend, pruebas, documentación y capítulo de estudio. Ejecutó comprobaciones de lógica, PostgreSQL y navegador.
- **Decisiones:** consulta única de solo lectura con comercio autenticado; fotografía temporal que conserva ediciones; cálculo decimal exacto; texto y CSV derivados de la misma selección editada. No se agregan órdenes persistidas ni nuevas dependencias.
- **Pruebas:** 40/40 de lógica/HTTP, 24/24 de integración, build y 10 pasos en Edge, incluyendo escritorio y móvil. [Informe y evidencias](implementacion/etapa-5.md). Portapapeles con respuestas controladas; descarga CSV real. No se probó Excel ni despliegue/piloto.
- **Para estudiar:** [capítulo de etapa 5](../preparacion-defensa-oral.md#etapa-5--alertas-y-reposición). Explicar mínimo frente a objetivo, diferencia entre pedir y recibir, temporalidad de la lista, permisos y CSV.
- **Siguiente paso:** compartir un commit identificable con Nazareno y Claude, resolver observaciones y registrar la aprobación antes de integrar. La comprensión individual sigue pendiente de practicar.

### Etapa 5 — Revisión y ajustes del 11/11/2026

Nazareno compartió mediante Tomás la revisión de Claude sobre b9675f9: sin bloqueantes, cuatro sugerencias. Codex las aplicó y verificó localmente (42/42, build, 10 pasos en Edge). La corrección relevante para estudiar es evitar que 1.000 unidades se entienda como uno: en esta lista solo se escriben dígitos. También se precisó dónde se convierte Decimal a texto. No se atribuyen las ejecuciones automatizadas como pruebas personales de los estudiantes. [Registro completo](implementacion/etapa-5.md#revisión-cruzada-y-correcciones--11112026). Pendiente de confirmación del nuevo commit por Claude e integración.
