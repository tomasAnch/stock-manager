# Hoja de ruta de implementación

Documento de trabajo del equipo · Creado el 28/10/2026.

Este plan organiza el desarrollo por dependencias y resultados verificables. No asigna días a las etapas ni modifica el alcance por el tiempo disponible. Se actualizará a medida que se avance. Es una guía de implementación, no una nueva consigna de la materia.

## Punto de partida

- [x] Propuesta y stack definidos en la primera entrega.
- [x] Diseño, requerimientos, reglas y módulos documentados en la segunda entrega.
- [x] Correcciones de diseño y pruebas SQL registradas: 32 comprobaciones en PostgreSQL y siete CHECK, ejecutados el 29/09. Es evidencia de esa ejecución, no una prueba de la aplicación futura.
- [x] Aprobación de la segunda entrega por Sofía y autorización para implementar, según el mensaje que compartió Tomás el 28/10. No se presupone que esa sea la fecha en que la docente lo envió.
- [ ] Aplicación implementada y funcionando.
- [ ] Pruebas de integración, interfaz y uso piloto realizadas.
- [ ] Despliegue, informe final y video terminados.

El último commit local revisado al preparar el plan es `20ac7ea`. La carpeta estaba limpia antes de agregar esta hoja de ruta y actualizar el README. Tomás comprobó con fetch/status que no había cambios remotos antes de comenzar. No se ejecutan comandos de Git desde el asistente por preferencia del equipo.

## Documentos que guían el trabajo

- [Requerimientos y permisos](segunda_entrega/01-requerimientos.md): RF-01 a RF-12 y RNF-01 a RNF-08.
- [Reglas de negocio](segunda_entrega/02-reglas-de-negocio.md): RN-01 a RN-15.
- [Modelo de datos](segunda_entrega/03-modelo-de-datos.md), [esquema Prisma](segunda_entrega/schema.prisma) y [CHECK](segunda_entrega/restricciones.sql).
- [Módulos](segunda_entrega/04-modulos.md): organización y operaciones transaccionales.

Se conserva React, Node.js con Express, PostgreSQL y Prisma 7. El backend será JavaScript con módulos ES y ejecución mediante tsx. Las versiones concretas compatibles se verificarán al preparar el entorno. No se cambia el stack ni se agregan funcionalidades fuera del MVP sin una decisión explícita del equipo.

## Forma de avanzar

Cada función se completará de punta a punta: pantalla, validaciones del backend y persistencia. Así se podrá usar y revisar una parte de la aplicación antes de terminar todas las demás. El diseño visual básico se establecerá al iniciar el frontend y se mantendrá entre módulos.

En cada etapa:

1. Leer los RF y RN que corresponden y definir el resultado observable.
2. Implementar en cambios pequeños, manteniendo una versión que pueda ejecutarse.
3. Ejecutar las comprobaciones pertinentes; corregir los fallos antes de dar por terminada la etapa.
4. Probar el recorrido desde la interfaz cuando exista una pantalla involucrada.
5. Actualizar la documentación y esta checklist con resultados reales, limitaciones y siguiente paso.
6. Preparar un resumen breve para Tomás y Nazareno: qué funciona, cómo probarlo y qué deben entender para explicarlo.

No se necesita una aprobación nueva para cada archivo, test o arreglo técnico dentro del alcance acordado. Se consulta cuando falte información imprescindible, acceso a una cuenta, una decisión de costo, un cambio de alcance o una acción que pueda afectar datos existentes. Una duda se registra con su impacto; no se resuelve inventando una regla. Si bloquea una parte, se continúa con trabajo independiente cuando sea posible.

## Etapa 0 — Preparar el trabajo compartido

- [x] Revisar el estado local y remoto: Tomás ejecutó fetch/status y confirmó main al día. Los comandos de Git quedan a cargo de Tomás.
- [x] Acordar el trabajo: Codex implementa; Nazareno y Claude revisan cada etapa sobre la versión compartida. Las correcciones se integran antes de seguir con partes afectadas.
- [x] Confirmar el recorrido inicial: conexión, acceso, catálogo, inventario y reposición, según los RF vigentes. La etapa 1 incluye solo la pantalla de conexión.
- [ ] Identificar las cuentas disponibles para despliegue y el comercio piloto, sin convertir su disponibilidad en un bloqueo de toda la programación.

**Terminada cuando:** se conoce la versión de partida, el alcance vigente y dónde integrar cada cambio. Las decisiones externas pendientes tienen responsable y no quedan escondidas.

## Etapa 1 — Entorno, base de datos y aplicación mínima

- [x] Fijar versiones compatibles de Node.js, Prisma, adaptador de PostgreSQL y tsx; guardar dependencias y archivo de versiones bloqueadas.
- [x] Configurar backend Express y frontend React con instrucciones de instalación y arranque.
- [x] Incorporar `.gitignore` y `.env.example` sin secretos; separar base de desarrollo y base de pruebas.
- [x] Ubicar el esquema operativo en `backend/prisma/schema.prisma`. Conservar la versión de entrega como antecedente identificado, sin mantener dos fuentes vigentes que se editen manualmente.
- [x] Crear la migración inicial desde el esquema e incorporar los siete CHECK. Comprobar que una base vacía se reconstruye con las migraciones, no con pasos manuales ocultos.
- [x] Configurar el cliente Prisma generado y su adaptador; probar lectura y escritura desde el backend con reversión o limpieza de los datos de prueba.
- [x] Crear un seed reproducible de cuentas y datos de prueba, incluyendo dos comercios para comprobar aislamiento. Las contraseñas se obtienen del entorno y se guardan como hash.
- [x] Establecer el manejo común de errores, validaciones, cantidades decimales y comunicación entre frontend y backend.
- [x] Preparar comandos de pruebas y compilación del frontend; definir la configuración de despliegue antes de acumular módulos.

**Terminada cuando:** otra instalación puede arrancar el proyecto siguiendo el README, crear la base desde cero y comprobar la comunicación React → Express → PostgreSQL. Las pruebas trabajan sobre una base identificada como exclusiva de pruebas.

## Etapa 2 — Acceso y permisos

RF-01 y RF-02; RN-01 y RN-15.

- [ ] Implementar login, cierre de sesión y navegación según dueño/empleado.
- [ ] Validar token, vencimiento y usuario activo en cada solicitud protegida; obtener rol y comercio desde el usuario consultado.
- [ ] Centralizar permisos y filtros por comercio, sin aceptar el comercio enviado por el cliente como autorización.
- [ ] Probar credenciales inválidas, token vencido, usuario desactivado, operaciones de otro rol y referencias a otro comercio.
- [ ] Hacer un primer ensayo de despliegue del recorrido disponible cuando estén las cuentas y accesos. Registrar cualquier bloqueo externo y continuar con módulos independientes.

**Terminada cuando:** ambos roles acceden a su interfaz y las solicitudes no autorizadas se rechazan también al llamar directamente a la API. El resultado del ensayo online se registra por separado; una pantalla local no cuenta como despliegue.

## Etapa 3 — Catálogo y alta con stock inicial

RF-03 a RF-06; RN-02 a RN-05, RN-07, RN-09 a RN-11.

- [ ] Implementar categorías y proveedores: alta, consulta, edición, normalización, bajas y reactivaciones.
- [ ] Implementar productos: alta, búsqueda, detalle, edición de datos y umbrales, baja lógica y reactivación.
- [ ] Crear el stock inicial usando una operación de Inventario dentro de la misma transacción del alta. Esa operación se reutilizará en la etapa siguiente.
- [ ] Mantener saldos e historial fuera de la edición directa del producto; respetar referencias activas, del mismo comercio, y unidad estable cuando existe historial.
- [ ] Probar duplicados, normalización, precisión y rango, permisos, referencias ajenas/inactivas y reversión completa si falla el ingreso inicial.
- [ ] Verificar bajas y asignaciones concurrentes de referencias según la estrategia del diseño.

**Terminada cuando:** el dueño puede cargar y mantener un catálogo real desde la pantalla, el empleado puede consultarlo y los casos inválidos se rechazan sin dejar registros parciales.

## Etapa 4 — Movimientos e historial

RF-07 a RF-09; RN-04 a RN-11.

- [ ] Implementar ingresos, salidas y ajustes; limitar los ajustes al dueño y exigir explicación.
- [ ] Reutilizar la operación transaccional: bloquear y validar el producto, actualizar saldo de forma condicional e insertar el movimiento con el usuario autenticado.
- [ ] Implementar historial por producto, con paginación y acceso a productos inactivos.
- [ ] Probar unidades enteras, fracciones de kg, cantidades fuera de precisión/rango, motivos incompatibles e ingresos sobre inactivos.
- [ ] Ejecutar dos egresos simultáneos reales contra PostgreSQL: con saldo 3 y dos retiros de 3, confirmar uno solo.
- [ ] Provocar un fallo entre actualización e inserción y verificar que no cambia ni saldo ni historial. Conciliar saldos almacenados contra movimientos.
- [ ] Probar la coordinación con baja y cambio de unidad, y evitar dobles envíos desde el formulario mientras una solicitud esté pendiente.

**Terminada cuando:** ambos roles pueden registrar sus operaciones desde la interfaz, el historial las refleja y las pruebas demuestran que no se crean saldos negativos ni escrituras parciales.

## Etapa 5 — Alertas y reposición

RF-10 a RF-12; RN-12 a RN-14.

- [ ] Mostrar productos activos con stock menor al mínimo, respetando mínimo cero e igualdad al mínimo.
- [ ] Generar para el dueño la lista por proveedor, calculando objetivo menos stock actual.
- [ ] Permitir editar cantidades y omitir ítems temporalmente, con las validaciones de unidad correspondientes.
- [ ] Implementar copia de texto, alternativa de copia manual y descarga CSV desde la misma lista editada.
- [ ] Probar lista vacía, permisos, recálculo y ausencia de cambios en stock al copiar o exportar.
- [ ] Verificar el CSV de RN-14: UTF-8 con BOM, `;`, coma decimal, fecha del cálculo, escape de campos y tratamiento de texto que pueda interpretarse como fórmula.

**Terminada cuando:** el dueño obtiene faltantes, modifica la lista y puede usar ambas salidas. El empleado consulta alertas pero no genera ni exporta reposición.

## Etapa 6 — Verificación del conjunto y despliegue final

- [ ] Ejecutar el recorrido completo: login → alta → ingreso/egreso → alerta → reposición → copia/CSV.
- [ ] Revisar interfaz en escritorio y móvil, navegación por teclado, mensajes de error y estados vacíos/de carga.
- [ ] Repetir la batería relevante de integración, comprobar compilación y realizar una instalación desde cero con migraciones y seed.
- [ ] Completar el despliegue de frontend, backend y base, comprobar HTTPS, configuración de orígenes, variables de entorno y persistencia tras reiniciar.
- [ ] Verificar desde la URL online los mismos recorridos y permisos. No dar por aprobado el entorno online solo porque funciona localmente.
- [ ] Confirmar que no se versionan secretos ni se exponen credenciales de demostración con acceso a datos reales.

El campus exige al menos un componente principal online. La meta operativa es que la aplicación completa pueda usarse desde su URL; las cuentas, servicios y costos se decidirán con el equipo antes de contratar o publicar recursos.

**Terminada cuando:** Tomás y Nazareno pueden usar el sistema online, se mantienen las reglas de negocio y existen instrucciones para instalarlo y recuperar el entorno.

## Etapa 7 — Piloto, documentación y entrega

La coordinación del piloto empieza en la etapa 0. La redacción del informe y la guía de defensa se alimentan desde cada etapa; no se dejan enteramente para este cierre.

- [ ] Realizar la semana de prueba con un comercio prevista en la documentación. Registrar casos, tiempos, problemas y resultados reales. Si no se consigue un piloto, consultar la alternativa con Sofía; no presentar una simulación como prueba real ni quitar el compromiso sin acordarlo.
- [ ] Medir el objetivo de carga de movimientos en menos de 10 segundos bajo condiciones registradas, sin darlo por cumplido por anticipado.
- [ ] Corregir los problemas detectados y volver a probar los recorridos afectados.
- [ ] Actualizar README, instrucciones, esquema/migraciones y documentos que hayan cambiado durante la implementación.
- [ ] Preparar el informe final con problema, solución desarrollada, decisiones, pruebas, resultados y límites reales.
- [ ] Preparar guion y grabar el video explicativo; el campus indica preferentemente en inglés, no lo establece como requisito obligatorio.
- [ ] Armar una guía breve de defensa separada en frontend, backend, base de datos y decisiones, usando el código efectivamente construido.
- [ ] Revisar enlaces, acceso online, instalación, archivos y requisitos de entrega. Subir la versión acordada y avisar a la docente por el canal correspondiente.

**Terminada cuando:** el repositorio contiene código, esquema/migraciones y documentación; la app online es accesible, el informe y video están listos y el equipo puede explicar el recorrido principal. La aprobación académica posterior corresponde a la docente/comité, no a la checklist técnica.

## Pruebas durante todo el desarrollo

| Tipo | Qué comprueba | Cuándo |
|---|---|---|
| Pruebas de lógica | Normalización, cantidades, sugerencias y formato CSV. | Al implementar o modificar esa lógica. |
| Integración con PostgreSQL | Permisos de la API, referencias, migraciones, transacciones y concurrencia. | En cada módulo que consulte o modifique datos. |
| Recorridos de interfaz | Que la persona complete una tarea y entienda un rechazo. | Al completar una función de punta a punta. |
| Regresión | Que un cambio no rompa recorridos anteriores. | Según las partes afectadas; batería completa en hitos de integración y antes de entregar. |
| Piloto | Utilidad real y tiempos del comercio. | Con una versión funcional, durante el período comprometido. |

Se priorizan comportamientos importantes y errores posibles; no se agrega un test por cada línea ni se promete un porcentaje de cobertura arbitrario. Pasar pruebas de una función no demuestra que el sistema completo esté terminado. Un test fallido se investiga: no se desactiva para marcar una etapa como completa.

## Registro de avance y continuidad

**Estado actual:** etapa 1 implementada y verificada localmente, pendiente de revisión por Naza/Claude. Ver [explicación y pruebas](implementacion/etapa-1.md). Las etapas 2 a 7 siguen pendientes.

**Siguiente acción:** compartir la etapa 1 para revisión (Git lo ejecuta Tomás); resolver observaciones y continuar con acceso y permisos.

**Datos externos pendientes:** disponibilidad y acceso al comercio piloto; cuentas y condiciones del hosting. No se necesitan para redactar o probar toda la lógica local.

**Referencia de entrega:** la consigna adjuntada el 28/10 fija el 14/11 para el informe/video y el 21/11 como fin de cursado; su línea de tiempo también llega al 21/11. Usar el 14/11 como referencia mientras no exista otra indicación de Sofía. Estas fechas no determinan el orden ni la profundidad de las etapas.

Al cerrar una sesión, actualizar aquí:

- Etapa y tareas completadas, indicando archivos o commit.
- Comandos de verificación ejecutados y resultado, diferenciando lo pendiente.
- Decisiones tomadas y dudas que requieren al equipo.
- Próxima tarea concreta para retomar sin reconstruir todo el contexto.

Para compartir con Claude, enviar una versión identificable del cambio y el resultado de sus pruebas. Conviene revisar hitos completos, en especial inventario y cierre de integración, para que ambos revisores evalúen el mismo código y no dos versiones distintas. Las observaciones se resuelven en el repositorio y se vuelven a verificar.
