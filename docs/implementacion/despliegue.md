# Preparación del despliegue

Etapa 1 · 28/10/2026. Configuración prevista, todavía no desplegada ni verificada en un proveedor cloud. Los servicios, cuentas y costos se acuerdan con el equipo antes de publicar. El primer ensayo online corresponde a la etapa 2 cuando estén los accesos.

## Backend

- Directorio de trabajo: raíz del repositorio, porque usa npm workspaces y un único lockfile.
- Runtime: Node 24.22.1, igual que desarrollo.
- Instalación/build: `npm ci --include=dev` y `npm run generate`. El CLI de Prisma está en dependencias de desarrollo y se necesita para migrar/generar.
- Migración antes del arranque: `npm run db:migrate`. No usar `db push`, ejecutar el SQL de la segunda entrega ni hacer reset de una base con datos.
- Inicio: `npm start`. tsx y el adaptador de PostgreSQL son dependencias de ejecución.
- Variables: `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT` asignado por el servicio, `DATABASE_URL` y `FRONTEND_ORIGIN` con el origen HTTPS del frontend sin barra final.
- Comprobación de disponibilidad: `/api/health`. Devuelve 503 si la base o la tabla consultada no están disponibles. No devuelve versión, cuentas ni datos de negocio.
- Usar la conexión y TLS indicados por el proveedor sin desactivar la validación de certificados. Revisar conexión directa para migraciones si el servicio ofrece un pool separado.

No ejecutar el seed de demostración en producción: mantener `NODE_ENV=production` y `ALLOW_DEMO_SEED=false`. El alta de cuentas piloto reales y sus credenciales se coordinará antes del primer despliegue funcional. No se guarda información sensible en este documento.

### Cómo ejecutar la migración según el servicio

“Antes del arranque” describe el orden, no obliga a usar un hook específico. En Render, el comando **pre-deploy** está disponible en servicios pagos; no se puede asumir su disponibilidad en el plan gratis. Si se elige un servicio sin ese hook, el primer despliegue puede coordinarse manualmente: desde una copia con las migraciones de la versión a publicar, configurar la conexión directa de la base elegida, ejecutar `npm run db:migrate`, verificar el resultado y recién después publicar esa versión. Esa sesión debe tener `NODE_ENV=production` y el seed deshabilitado. Las credenciales se configuran fuera del repositorio. Fuente: [despliegues de Render](https://render.com/docs/deploys), consultada el 29/10/2026.

Otra posibilidad es incorporar la migración a un paso automatizado de entrega o al build si el proveedor lo permite. No se configura todavía: antes hay que verificar conectividad, credenciales, compatibilidad con la versión que sigue funcionando y evitar que un build de vista previa migre producción. La decisión y el comando efectivo se registrarán al elegir el hosting.

La base gratuita de Render expira a los **30 días desde su creación**. Si se crease el 29/10, ese plazo llegaría al 28/11, después del 14/11; aun así podría no cubrir la defensa. Se evaluarán las opciones del stack, incluida Supabase, con sus condiciones vigentes y la duración necesaria antes de decidir. No se presupone que otro plan gratuito no tenga límites. Fuente: [plan gratuito de Render](https://render.com/docs/free), consultada el 29/10/2026.

## Frontend

- Directorio de trabajo: raíz del repositorio.
- Instalación: `npm ci --include=dev`.
- Compilación: `npm run build -w frontend`.
- Directorio publicado: `frontend/dist`.
- Variable al compilar: `VITE_API_URL=https://URL-DEL-BACKEND` sin barra final. Es una URL pública, no una credencial.
- Cambiar la variable requiere recompilar. `API_PROXY_TARGET` solo sirve para desarrollo local; el servidor de Vite no se publica como servidor de producción.

## Comprobación del primer despliegue

- [ ] `/api/health` responde correctamente desde el servicio real.
- [ ] El frontend usa HTTPS y consulta la URL correcta del backend.
- [ ] CORS permite el origen del frontend; no se utiliza como sustituto de autenticación.
- [ ] La migración queda registrada y no vuelve a crear tablas al reiniciar.
- [ ] Los datos persisten tras reiniciar la aplicación.
- [ ] Se documentan proveedor, comandos efectivos, variables sin valores secretos y URL de acceso.

El mínimo del campus es un componente principal online. El objetivo del proyecto es poder usar la aplicación completa desde una URL. Ninguno de estos puntos se marca como cumplido por haber funcionado localmente.
