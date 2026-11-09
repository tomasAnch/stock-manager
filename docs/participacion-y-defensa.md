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

Estas explicaciones resumen la [hoja de ruta técnica](plan-desarrollo.md), donde está la checklist completa. Antes de implementar, leer también los [requerimientos](segunda_entrega/01-requerimientos.md) y las [reglas de negocio](segunda_entrega/02-reglas-de-negocio.md). Todas las etapas siguientes están pendientes; el orden es 2 → revisión → 3 → revisión → 4 → revisión → 5 → revisión → 6 → 7.

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

- **Estado:** implementada el 05/11/2026 y probada por Nazareno en su equipo. Revisada por Tomás con Codex el 06/11; correcciones aplicadas el 07/11, pendientes de que Nazareno repita las pruebas y Tomás las confirme.
- **Responsable:** Nazareno, con implementación asistida por Claude. **Revisor:** Tomás, con Codex.
- **Versión:** parte de `41bf10a`; revisada sobre `e6f0ce4` (rama `etapa-2-acceso`). *[Completar con el commit final después de las correcciones.]*
- **Qué quedó funcionando:** login, cierre de sesión, sesión que se revalida al recargar y al cambiar de sección, menú distinto para dueño y empleado, y controles `requireAuth`, `requireRole` y filtro por comercio listos para las etapas 3 a 5 (RF-01, RF-02, RN-01, RN-15). Detalle en [etapa 2](implementacion/etapa-2.md).
- **Asistencia de IA:** Claude escribió el código del backend y del frontend, las pruebas y la documentación de esta etapa, y ejecutó las pruebas automáticas, de integración y de navegador en una copia aislada. Las salidas están en [resultados de Claude](implementacion/resultados-etapa-2-claude-2026-11-05.txt).
- **Aporte personal de Nazareno:** pidió la implementación y la revisión con Claude. Agregó `JWT_SECRET` a su `.env`, ejecutó en su equipo `npm ci`, `npm run generate`, `npm test` (25/25) y `npm run test:integration` (7/7) (salida en [resultados de Nazareno](implementacion/resultados-etapa-2-naza-2026-11-05.txt)) y recorrió a mano el login, la recarga y el cierre de sesión con ambos roles.
- **Aporte personal de Tomás:** *[Completar con la revisión con Codex.]*
- **Decisiones importantes:** rol y comercio leídos de la base en cada solicitud, no del token; token en el encabezado y en `sessionStorage` en lugar de cookie; mismo mensaje para cualquier credencial inválida. Motivos y alternativas en [etapa 2](implementacion/etapa-2.md#decisiones).
- **Pruebas y evidencia:** 05/11: 25/25 de lógica/HTTP, 7/7 de integración en dos ejecuciones y 11 pasos de navegador, ejecutados por Claude; en el equipo de Nazareno (Windows), 25/25 y 7/7, más el recorrido manual con ambos roles. 07/11, después de las correcciones: 26/26, 7/7 en dos ejecuciones y 7 pasos de navegador, ejecutados por Claude ([salida](implementacion/resultados-etapa-2-claude-2026-11-07.txt)).
- **Revisión cruzada:** Tomás revisó con Codex el 06/11: una observación bloqueante (el login aceptaba texto agregado después de los 72 bytes que compara bcrypt) y tres sugerencias (exigir el vencimiento del token, avisar los errores de conexión en el panel y no prometer tiempos idénticos en la documentación). Las cuatro se resolvieron el 07/11, cada una con su prueba; detalle en [etapa 2](implementacion/etapa-2.md#revisión-cruzada).
- **Para explicar en la defensa:** la diferencia entre identificar (login, `requireAuth`) y autorizar (`requireRole`, filtro por comercio); por qué cambiar el rol en el navegador no sirve; el ejemplo del empleado desactivado con un token todavía vigente.
- **Comprensión pendiente de practicar:** que Nazareno explique con sus palabras el recorrido del login y el de una solicitud protegida.
