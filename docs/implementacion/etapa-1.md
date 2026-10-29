# Etapa 1 — Entorno, base de datos y aplicación mínima

Registro de la implementación local del 28/10/2026. La revisión posterior y su evidencia nueva están en [revisión del 29/10](revision-etapa-1.md). Los conteos de este documento corresponden a la primera versión; no equivale a la aplicación completa ni a un despliegue público.

## Qué funciona

La pantalla React consulta `GET /api/health`. Express utiliza el cliente generado de Prisma, con el adaptador de PostgreSQL, para consultar la tabla de comercios. Si funciona devuelve un estado de conexión; si no puede consultar la base devuelve 503. La respuesta no contiene datos del comercio, usuarios ni detalles internos de la conexión.

Es el primer recorrido completo **pantalla → servidor → base de datos → pantalla**. Todavía no hay login, ABM, movimientos ni listas de reposición.

| Parte | Archivos principales | Para qué sirven |
|---|---|---|
| Instalación | [package.json](../../package.json), [package-lock.json](../../package-lock.json) | Un comando de instalación para frontend y backend; mismas dependencias para ambos integrantes. |
| Modelo operativo | [schema.prisma](../../backend/prisma/schema.prisma) | Define las seis tablas; la copia de segunda entrega queda como antecedente. |
| Migración | [migration.sql](../../backend/prisma/migrations/202610280001_initial/migration.sql) | Crea tablas, índices, relaciones y los siete CHECK. Prisma registra que fue aplicada. |
| Datos iniciales | [seed-data.js](../../backend/prisma/seed-data.js) | Crea dos comercios y cuatro cuentas ficticias con contraseñas hasheadas, más referencias de catálogo. No genera productos ni movimientos. |
| API | [app.js](../../backend/src/app.js), [server.js](../../backend/src/server.js) | Define las respuestas HTTP y arranca/cierra el servidor. |
| Prisma y validaciones | [prisma.js](../../backend/src/lib/prisma.js), [validation.js](../../backend/src/lib/validation.js) | Conexión compartida y reglas comunes para nombres y cantidades exactas. |
| Pantalla | [App.jsx](../../frontend/src/app/App.jsx), [api.js](../../frontend/src/services/api.js) | Consulta, estados de carga/error y reintento. |

## Decisiones de esta etapa

- Node 24.22.1, Prisma y adaptador 7.10.1, Express 5.3.0, React 19.3.1, Vite 8.3.5 y tsx 4.23.15. Se fijan las versiones efectivamente instaladas y comprobadas; no se adopta la versión candidata de Prisma 8 que anuncia la CLI.
- JavaScript con módulos ES. tsx ejecuta tanto el código del servidor como el TypeScript del cliente generado. No se versionan `node_modules`, el cliente generado ni `dist`.
- npm workspaces mantiene un solo lockfile, sin agregar una herramienta de gestión de monorepos.
- La migración se generó desde el esquema operativo con Prisma 7.10.1 y se le añadieron los CHECK del diseño. No cambió el modelo de negocio.
- PostgreSQL de desarrollo y de pruebas usan bases distintas. La prueba de integración exige el nombre `stock_manager_test`, rechaza datos preexistentes y limpia solo después de haber comprobado que estaba vacía. No se ejecuta un reset de bases.
- Las cantidades llegan a las validaciones como cadenas con punto decimal, se calculan con Decimal y se serializan como texto. La futura interfaz aplicará el formato local.
- El seed es de demostración: conserva cuentas ya creadas, no restablece contraseñas al repetirse y falla si encuentra una cuenta con otro comercio o rol. No se ejecuta en producción.
- El endpoint de disponibilidad es público y solo informa el estado; los endpoints de negocio y su autorización se agregan en la etapa 2. No hay datos de comercios expuestos en esta etapa.

## Verificación realizada

| Verificación | Resultado |
|---|---|
| Instalación reproducible con `npm ci` | Correcta desde el lockfile, seguida por generación del cliente. |
| `npm test` | 8 pruebas correctas: normalización, decimales, configuración, protección de base de pruebas y respuestas HTTP. |
| `npm run test:integration` | 5 pruebas correctas con PostgreSQL 18.6: esquema/CHECK, seed repetible, escritura y rollback, rechazo por CHECK y recorrido HTTP hasta la base. |
| `npm run build` | Cliente generado y frontend compilado correctamente. |
| Navegador Edge, escritorio 1440×1050 | Conexión real; error ante 503 simulado; reintento contra servicio real correcto. |
| Navegador Edge, móvil 390×844 | Pantalla adaptable sin desbordamiento horizontal. |

La instalación y las pruebas se ejecutaron usando Node 24.22.1 disponible en el entorno de trabajo; no se cambió el Node global del equipo de Tomás. Se utilizó una instancia temporal local PostgreSQL 18.6 en el puerto 55433, separada del servicio habitual, con las bases `stock_manager` y `stock_manager_test`. La configuración temporal utiliza acceso local de prueba y no es una configuración de seguridad para publicar.

Las pruebas HTTP inicialmente no pudieron conectarse a localhost desde el entorno restringido. Se repitieron con el acceso local permitido y pasaron. No se modificaron expectativas para ocultar ese fallo de entorno. Se guardan los [resultados de la ejecución final](resultados-etapa-1.txt) y el [resumen del navegador](navegador-etapa-1.json).

Estas pruebas no demuestran todavía permisos de usuarios, aislamiento de endpoints de negocio ni egresos simultáneos. Esos casos corresponden a las siguientes etapas. Los 32 casos SQL de septiembre siguen siendo evidencia histórica separada, no se suman al conteo de estas 13 pruebas.

## Cómo revisar esta etapa

1. Seguir la [instalación del README](../../README.md#instalación-y-ejecución) con Node 24.22.1 y dos bases propias vacías.
2. Aplicar migraciones y seed. Repetir ambos comandos: no deberían duplicar tablas, comercios ni cuentas.
3. Ejecutar las pruebas y compilar. Confirmar los conteos anteriores.
4. Arrancar `npm run dev` y abrir `http://localhost:5173`: comprobar el estado conectado.
5. En la pestaña Network de las herramientas del navegador, bloquear temporalmente `/api/health` y pulsar “Volver a comprobar”: debe aparecer el error. Quitar el bloqueo y reintentar: debe recuperarse.
6. Revisar las reglas comunes y la migración contra el diseño, y registrar observaciones indicando archivo y comportamiento concreto.

No se suben los archivos `.env`. Las claves utilizadas por los tests son fixtures sin acceso a los comercios reales. Cada integrante define sus contraseñas locales del seed. En la computadora de Tomás quedó un `.env` local apuntando a la instancia temporal de esta verificación; al cambiar de entorno debe actualizarse para su servicio PostgreSQL de desarrollo.

## Explicación breve para el equipo

**Migración:** es la receta versionada que crea o modifica la base. Una instalación nueva aplica esa misma receta. Los CHECK ya forman parte de ella: no se agregan a mano después.

**Seed:** agrega datos iniciales. No es la estructura de la base ni sustituye a las migraciones. En esta etapa carga ejemplos ficticios repetibles.

**Cliente Prisma:** es el código generado desde el esquema para consultar PostgreSQL. Nuestro servidor lo usa; no lo escribimos ni corregimos a mano.

**Prueba de integración:** comprueba que varias partes funcionan juntas. Acá ya consulta la base real desde el servidor, aunque todavía falten las funciones del negocio.

## Capturas

[Escritorio](etapa-1-escritorio.png) · [Móvil](etapa-1-movil.png).

## Próximo paso

Revisión de Naza con Claude sobre esta etapa. Los comandos de Git los ejecuta Tomás. Después de resolver observaciones relevantes, comenzar acceso, login y permisos, sin cambiar el alcance acordado.

Referencias utilizadas para la configuración: [Prisma 7](https://www.prisma.io/docs/orm/v7) y [guía de Vite](https://vite.dev/guide/). Los resultados de la tabla son de la ejecución local, no de esas referencias.
