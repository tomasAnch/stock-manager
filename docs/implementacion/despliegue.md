# Despliegue de Stock Manager

El sistema está publicado con Vercel para el frontend, Render para Express y Neon para PostgreSQL. La base publicada contiene datos ficticios.

- [Aplicación pública](https://stock-manager-plum-phi.vercel.app/)
- [Estado de la API y de la base](https://stock-manager-jome.onrender.com/api/health)
- [Evidencia de la prueba cruzada online](#prueba-cruzada-online--20112026)
- [Persistencia y recuperación](#persistencia-y-recuperación-para-la-defensa)

## Backend

- Directorio de trabajo: raíz del repositorio, porque usa npm workspaces y un único lockfile.
- Runtime: Node 24.22.1, igual que desarrollo.
- Instalación/build: `npm ci --include=dev` y `npm run generate`. El CLI de Prisma está en dependencias de desarrollo y se necesita para migrar/generar.
- Migración antes del arranque: `npm run db:migrate`. No usar `db push`, ejecutar el SQL de la segunda entrega ni hacer reset de una base con datos.
- Inicio: `npm start`. tsx y el adaptador de PostgreSQL son dependencias de ejecución.
- Variables: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT` asignado por el servicio, `DATABASE_URL`, `FRONTEND_ORIGIN` con el origen HTTPS del frontend sin barra final y `JWT_SECRET` propio del despliegue (nunca el de un equipo de desarrollo), más `JWT_EXPIRES_IN` si se cambia la duración de 8 h.
- Comprobación de disponibilidad: `/api/health`. Devuelve 503 si la base o la tabla consultada no están disponibles. No devuelve versión, cuentas ni datos de negocio.
- Usar la conexión y TLS indicados por el proveedor sin desactivar la validación de certificados. Revisar conexión directa para migraciones si el servicio ofrece un pool separado.

El entorno publicado mantiene `NODE_ENV=production` y el seed local deshabilitado. Las cuentas de la demo se cargan con el [procedimiento de preparación de la base online](#base-online-y-cuentas-de-demo--19112026). Si se incorpora un comercio piloto, coordinar sus cuentas y datos antes de iniciar esa prueba.

### Cómo ejecutar la migración según el servicio

La migración inicial de Neon se aplicó manualmente desde una copia con el esquema de la versión publicada. Para repetir ese procedimiento en una base nueva, configurar su conexión directa en una sesión privada, establecer `NODE_ENV=production`, mantener el seed deshabilitado y ejecutar `npm run db:migrate` antes de publicar la API. Para migraciones posteriores, revisar compatibilidad con la versión en servicio y preparar un respaldo antes de aplicar cambios. El build y las vistas previas se mantienen separados de las migraciones de producción.

## Frontend

- Directorio raíz del proyecto en Vercel: `frontend`, con preset Vite y Node 24.x.
- Instalación: detección de npm y del workspace desde el lockfile del repositorio.
- Compilación: `npm run build` desde `frontend`.
- Directorio publicado: `dist`, relativo a `frontend`.
- Variable al compilar: `VITE_API_URL=https://URL-DEL-BACKEND` sin barra final. Es una URL pública, no una credencial.
- Cambiar la variable requiere recompilar. `API_PROXY_TARGET` solo sirve para desarrollo local; el servidor de Vite no se publica como servidor de producción.

## Comprobación del primer despliegue

- [x] `/api/health` responde correctamente desde el servicio real.
- [x] El frontend usa HTTPS y consulta la URL correcta del backend.
- [x] CORS permite el origen del frontend. La autenticación conserva sus controles propios.
- [x] Neon registró la migración inicial.
- [x] Tomás y Nazareno realizaron recorridos online con dueño y empleado.
- [ ] Comparar saldo e historial tras reiniciar la aplicación.
- [ ] Restaurar un respaldo en una base separada y comprobar su contenido.
- [x] Se documentan proveedor, comandos efectivos, variables sin valores secretos y URL de acceso.

El mínimo del campus es un componente principal online. El objetivo del proyecto es poder usar la aplicación completa desde una URL. Ninguno de estos puntos se marca como cumplido por haber funcionado localmente.

## Alojamiento acordado

Entrega el 21/11/2026 y defensa a partir de febrero de 2027, según confirmó Tomás. La demo académica se publicará con Vercel Hobby para el frontend, Render Free Web Service para Express y Neon Free para PostgreSQL.

Compartir la URL de producción de Vercel. Render duerme la API tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en arrancar. El plazo de 30 días de Render corresponde a su Postgres gratuito. Neon suspende el cómputo cuando está inactivo y conserva los datos. Los servicios siguen sujetos a cuotas y condiciones del proveedor.

Antes de la defensa, comprobar la URL y el login con ambos roles unos días antes. El día de la mesa, abrir /api/health y esperar HTTP 200 antes de comenzar. Guardar fuera del repositorio un respaldo de los datos de demo y mantener las instrucciones de restauración junto con las migraciones.

Referencias: [Vercel](https://vercel.com/changelog/hobby-projects-now-retain-fewer-deployments-to-free-up-storage), [Render](https://render.com/docs/free) y [Neon](https://neon.com/blog/building-patterns-unlocked-by-scale-to-zero).

## Corrección de fechas antes del despliegue — 18/11/2026

Nazareno y Claude detectaron en la verificación local que el adaptador de Prisma 7 reemplazaba el desfase de los valores `timestamptz` recibidos por UTC sin convertir la hora. Con PostgreSQL en Argentina, el movimiento se guardaba tres horas antes y la lista de reposición devolvía una hora desplazada. El backend ahora pide `TimeZone=UTC` al abrir cada conexión. La presentación argentina en el listado y el CSV sigue a cargo del frontend.

Para el primer despliegue usar la URL **directa** de Neon en Render (opción de pooling desactivada en el cuadro Connect de Neon). El backend ya limita su pool a cinco conexiones por instancia. Mantener TLS y las opciones de conexión que indique Neon. Antes de cargar datos de demo, comprobar con el mismo cliente Prisma del backend que `SHOW timezone` devuelve `UTC`. Después, comprobar que el instante de un movimiento nuevo y el cálculo de reposición son correctos desde la URL pública. [Conexiones directas y con pool de Neon](https://neon.com/blog/postgres-support-case-recap).

El ajuste corrige las operaciones nuevas. Las fechas de movimientos que se guardaron con el desfase en bases locales anteriores quedan con el valor registrado. Evitar reutilizar esos datos de prueba al preparar la demo de Neon.

Verificación local del 18/11 sobre PostgreSQL 18 con zona por defecto `America/Argentina/Buenos_Aires`. La prueba nueva compara las fechas de la API con el reloj de PostgreSQL expresado en milisegundos desde Epoch. Antes del ajuste registró un desfase de tres horas en el movimiento. Después pasaron el alta del movimiento, su lectura en el historial y el cálculo de reposición, con 25/25 pruebas de integración y 42/42 unitarias. El ejecutable de migración de Prisma devolvió `spawn UNKNOWN`, por lo que la batería de integración se ejecutó directamente sobre la base temporal ya migrada. [Salida de la prueba de integración](resultados-etapa-6-fechas-integracion.txt).
## Base online y cuentas de demo — 19/11/2026

Tomás comprobó que Prisma se conecta a Neon con zona UTC y aplicó la migración `202610280001_initial` en `neondb` (rama `production`).

Para cargar las cuentas iniciales en una base de demo recién migrada, ejecutar desde la raíz `node --import tsx backend/prisma/preparar-demo-online.js` con las variables `DEMO_DATABASE_URL`, `DEMO_OWNER_PASSWORD` y `DEMO_EMPLOYEE_PASSWORD` en la sesión de terminal. El script requiere dos contraseñas distintas y usa bcrypt. Crea un comercio, un dueño, un empleado, una categoría y un proveedor en una sola transacción. Si ya hay comercios, rechaza la carga. Usar el script como operación puntual de preparación de la base. Render sigue arrancando con `npm start`.

Las cuentas son `dueno@demo.example.invalid` y `empleado@demo.example.invalid`. Guardar las contraseñas en el gestor y compartirlas por un canal privado con quienes prueben la demo.

Tomás confirmó que la carga inicial se completó en Neon el 19/11. El login con ambas cuentas se verificará una vez publicada la aplicación.

## Primer despliegue del backend — 19/11/2026

Tomás publicó `f2f85f2`, de `etapa-6-despliegue`, como Web Service Free de Render en Virginia. Codex consultó por HTTPS el [endpoint de salud público](https://stock-manager-jome.onrender.com/api/health) y obtuvo HTTP 200 con `{"status":"ok","database":"connected"}`. Render todavía devuelve `http://localhost:5173` como origen permitido. Después de publicar el frontend, configurar `FRONTEND_ORIGIN` con la URL de producción de Vercel y verificar los recorridos con ambas cuentas.

## Frontend en producción y primer login — 19/11/2026

Tomás publicó [Stock Manager](https://stock-manager-plum-phi.vercel.app/) en Vercel Hobby desde `main` (`da09193`). Configuró el directorio `frontend`, el preset Vite, `npm run build`, la salida `dist` y `VITE_API_URL=https://stock-manager-jome.onrender.com`. El primer intento falló con `EBADENGINE` porque Vercel eligió Node 26. Se fijó Node 24.x en el proyecto y se volvió a desplegar con éxito.

Tomás configuró `FRONTEND_ORIGIN=https://stock-manager-plum-phi.vercel.app` en Render y entró como dueño desde la URL de producción. El panel mostró «La conexión está lista». Codex comprobó HTTP 204 en la solicitud previa al POST de login y el encabezado `Access-Control-Allow-Origin` con ese dominio exacto.

Tomás recorrió el alta, la salida y la reposición en producción con un producto de demo. En el caso probado, con stock inicial 6, mínimo 5, objetivo 10 y salida de 2 unidades, el CSV abrió en Excel con las seis columnas esperadas y una sugerencia de 6 unidades. La captura muestra el código `DEMO01` y el nombre `DEMO-01`. La hora completa de cálculo se puede comprobar en la celda B2, ya que el ancho de la columna la recorta en la captura.

Tomás también entró desde Vercel como empleado e hizo el ingreso de una unidad indicado en la prueba. La captura posterior muestra el rol EMPLEADO y la lista de alertas vacía. El resultado esperado era subir de 4 a 5 unidades y salir de la alerta al igualar el mínimo. En esa pantalla se ve la opción de actualizar alertas y la generación queda reservada al dueño.

## Prueba cruzada online — 20/11/2026

Nazareno hizo el recorrido desde la URL de producción con el producto ficticio `NAZA01`. Los resultados provienen de su reporte. Claude inspeccionó el archivo CSV exportado.

| Comprobación | Resultado informado |
|---|---|
| Dueño: alta y salida | Creó el producto con saldo 6, mínimo 5 y objetivo 10. Una salida de 2 dejó saldo 4. El historial mostró las 23:50 del 19/11, con el reloj del equipo en 23:51 al comprobarlo. |
| Egreso superior al saldo | Una salida de 5 se rechazó con saldo disponible de 4. El historial mantuvo sus dos movimientos. |
| Lista y CSV | La lista sugirió 6 unidades. Al editar a 7, el texto y el CSV incluyeron 7. El CSV consignó `2026-11-20 00:58:58-03:00`, la hora del cálculo. Claude comprobó BOM, separador de punto y coma y terminadores CRLF. |
| Empleado: permisos y reposición | Pudo consultar el producto y ver la alerta con 4 de 5 unidades. Los controles de alta, edición, baja y generación de lista quedaron reservados al dueño. Un ingreso de 1 dejó saldo 5, registró la hora local `01:04` y retiró el producto de la alerta. |
| Reactivación del servicio | Tras una hora de inactividad, la app avisó que no podía confirmar un movimiento. Nazareno verificó el saldo y el historial antes de volver a enviar. Con la API disponible pudo continuar. |

En una nueva comprobación pública, el 20/11 el frontend respondió HTTP 200 y la API devolvió HTTP 200 con `status: ok` y `database: connected`. En una base local temporal con PostgreSQL 18, Codex aplicó desde cero la migración inicial y ejecutó 25/25 pruebas de integración. También pasaron 42/42 pruebas unitarias y de HTTP y `npm run build`.

## Persistencia y recuperación para la defensa

1. Tomás anota el saldo y el último movimiento de `DEMO01` en producción, con hora y cantidad. Coordina el momento con Nazareno para que el reinicio no interrumpa su prueba cruzada.
2. En Render, abre **Deploys → Manual Deploy → Restart service** y espera que vuelva a **Live**. Esa acción inicia otra instancia con el mismo commit y configuración. [Reinicio en Render](https://render.com/docs/deploys#restarting-a-service).
3. Vuelve a abrir [la app](https://stock-manager-plum-phi.vercel.app/), entra y compara el saldo y el historial. Anota el resultado antes y después como evidencia de persistencia.
4. Después de las pruebas, exporta un respaldo con `pg_dump` en formato personalizado (`-Fc`) usando el endpoint directo de Neon y un cliente PostgreSQL de versión compatible. Guarda el archivo fuera del repositorio en una ubicación privada porque contiene datos de negocio y hashes de cuentas. Inspecciona el índice con `pg_restore --list`.
5. Para ensayar recuperación, restaura el archivo completo con `pg_restore --single-transaction --no-owner --no-acl` en una base nueva y vacía. Comprueba los usuarios y el producto de demo allí. Si hubiera que recuperar el servicio, apunta Render a la base restaurada tras comprobar su contenido y repite el login y el recorrido de inventario. [Exportación y restauración en Neon](https://neon.com/docs/import/migrate-from-postgres).

El reinicio con comparación y el respaldo con restauración todavía están pendientes de ejecución. Al completarlos, registrar fecha, responsable, versión, saldo e historial antes y después, y comprobaciones en la base restaurada. Guardar el respaldo en privado.
