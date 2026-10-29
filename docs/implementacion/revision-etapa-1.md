# Revisión de la etapa 1

29/10/2026 · Correcciones a partir de la revisión de Nazareno y Claude.

La ronda está implementada y verificada localmente. No cambia el alcance del MVP ni incorpora el login de la etapa 2. Queda compartir esta versión para la revisión cruzada y probar la instalación en el equipo de Nazareno.

## Qué se corrigió

| Punto | Cambio aplicado |
|---|---|
| R1 — Errores del seed | Se distinguen los rechazos por producción, falta de habilitación, contraseña inválida y cuenta incompatible. Los mensajes explican el problema sin mostrar contraseñas. |
| R2 — Diagnóstico del servidor | Los errores inesperados y los fallos de conexión dejan un registro con tipo, código reconocido y hasta cinco ubicaciones de archivo/línea. No se registra el error completo, su mensaje, metadatos, rutas completas ni datos de la solicitud. La respuesta HTTP sigue siendo genérica. |
| R3 — Habilitación del seed | `npm run db:seed` exige `ALLOW_DEMO_SEED=true` y se rechaza siempre en producción. Esto permite una base remota de desarrollo sin habilitar la carga por defecto. El ejemplo de entorno trae `false`. |
| R4 — Despliegue | Se documentan dos alternativas para ejecutar migraciones según el servicio: paso previo del proveedor cuando esté disponible, o ejecución explícita antes de publicar. Se aclaran condiciones de Render; todavía no se eligió ni publicó el hosting. |
| R5 — Protección de la base de pruebas | Antes de ejecutar migraciones, el comando de integración comprueba que la base exclusiva de pruebas no contenga datos de negocio ni tablas/vistas ajenas. Si encuentra algo, se detiene sin modificarlo. Se mantienen también los controles de nombre y separación respecto de la base de desarrollo. |
| R6 — Pruebas interrumpidas | El README explica cómo reconocer restos de una ejecución anterior y recuperar únicamente una base local de pruebas confirmada como descartable. El proceso no borra datos automáticamente para intentar continuar. |
| O2 — CHECK específico | El caso de stock negativo exige que PostgreSQL rechace por `productos_stock_actual_no_negativo`; un error diferente no hace pasar el caso. |
| O3 — Referencias del plan | La hoja de ruta enlaza el esquema operativo y su migración. Los archivos de la segunda entrega permanecen como antecedentes. |
| O4 — Legibilidad | Se simplificaron la pantalla inicial, la preparación de cuentas/categorías/proveedores del seed y la comparación de identidad de las bases. |
| O5 — Archivos vacíos | Se quitaron los `.gitkeep` de carpetas que ya tienen archivos. Se conservan donde todavía hacen falta. |

Sobre O1: la migración inicial ya aplicada se conserva completa, incluidos sus comentarios históricos. Corregir un comentario dentro de esa migración cambiaría su checksum sin aportar un cambio de base de datos. Las aclaraciones vigentes están en esta documentación.

Node recomendado sigue siendo **24.22.1**. El rango admitido es **`>=24.22.1 <25`**, no una única versión exacta.

## Comprobaciones y evidencia nueva

La ejecución se hizo con asistencia de Codex en Windows, Node 24.22.1, Prisma 7.10.1 y PostgreSQL 18.6. Se preparó una copia del proyecto sin dependencias, cliente generado, compilación ni archivos `.env`; se instaló con `npm ci --offline --no-audit`, usando el lockfile y la caché local de paquetes. La generación del cliente también funcionó antes de crear el `.env` de esa copia.

Se usó una instancia temporal distinta en `127.0.0.1:55434`, con dos bases nuevas: `stock_manager` y `stock_manager_test`. La configuración de esta instancia es solo para pruebas locales. No se reemplazó el entorno de desarrollo existente del equipo.

| Verificación | Resultado observado |
|---|---|
| Bases nuevas | Ambas tenían cero tablas antes del ensayo. La salida muestra `Applying migration` para desarrollo y pruebas. |
| `npm test` | **14/14** pruebas de lógica y HTTP correctas. Incluyen diagnóstico sin datos sensibles, seed y controles previos de la base. |
| `npm run test:integration` | **5/5** correctas sobre PostgreSQL; segunda ejecución también correcta y sin migraciones pendientes. |
| Rechazo antes de migrar | Se ensayaron una tabla ajena con un registro y una tabla de negocio con datos. Ambos rechazos conservaron el registro y dejaron sin crear `_prisma_migrations`. Después se retiraron solo esos objetos creados para el ensayo. |
| Seed por su comando real | Rechazó habilitación ausente, producción y contraseña corta, con el motivo esperado. Dos ejecuciones válidas mantuvieron dos comercios, sin duplicarlos. |
| Compilación de producción | Correcta. Al final del registro se repite sin el `NODE_ENV=development` utilizado durante los ensayos, para comprobar el resultado de producción. |
| Interfaz | Conexión real, error 503 simulado, recuperación al reintentar y pantalla móvil sin desbordamiento ni errores JavaScript. |

Son **19 pruebas automatizadas**, además de los ensayos de instalación, comandos y navegador. Los datos de integración se limpiaron al finalizar; la base de desarrollo temporal conservó los dos comercios de demostración.

Archivos para revisar:

- [Salida de la instalación y verificación final](resultados-instalacion-final-2026-10-29.txt), con comandos, respuestas y códigos de salida. Los errores intencionales de los casos negativos están identificados como esperados.
- [Primer intento de esta ronda](resultados-instalacion-2026-10-29.txt), conservado como ejecución fallida. Detectó un `P2010` al leer el tipo interno de `pg_class.relkind` con Prisma. Se corrigió convirtiendo los campos del catálogo a `text`; después se repitió desde otra copia y bases vacías. El fallo inicial no cuenta como evidencia de un rechazo correcto por datos preexistentes.
- [Comprobaciones del navegador](navegador-revision-etapa-1.json), [captura de escritorio](revision-etapa-1-escritorio.png) y [captura móvil](revision-etapa-1-movil.png).

Esta es una instalación nueva en el mismo equipo de Tomás. No se presenta como una instalación realizada por Nazareno ni como una prueba de otro sistema operativo. La comprobación en su equipo sigue pendiente.

## Archivos históricos preservados

Se verificó que no cambiaron estos SHA-256 respecto del comienzo de la ronda:

| Archivo | SHA-256 |
|---|---|
| `backend/prisma/migrations/202610280001_initial/migration.sql` | `449212CA70028D58AD059F2922BB4FFFC1A58CBCF72D5B9ADDB73062415042F8` |
| `docs/implementacion/resultados-etapa-1.txt` | `E1308B14CF50C9A91833BA31DE6FBBCA882B97070F8E56F87EF99805526CF4AF` |

El [informe del 28/10](etapa-1.md) conserva los resultados de esa fecha; esta revisión agrega evidencia nueva sin reconstruir la salida anterior.

## Cómo seguimos

Tomás comparte los cambios mediante Git y Nazareno/Claude revisan esa versión. Para cargar otra vez datos de demostración en un entorno ya existente, hay que habilitar expresamente `ALLOW_DEMO_SEED=true`; no se modifica el `.env` personal desde esta corrección. Luego se continúa con acceso y permisos según la hoja de ruta.
