# Sistema de Control de Stock para Comercios Minoristas

Trabajo Final Integrador — Tecnicatura Universitaria en Programación, UTN.

[Abrir Stock Manager](https://stock-manager-plum-phi.vercel.app/) · [Estado de la API y de la base](https://stock-manager-jome.onrender.com/api/health)

## Integrantes

| Integrante | Aportes |
|---|---|
| Tomás Anchorena | Coordinación de la base inicial, catálogo y reposición. Configuración del despliegue. |
| Nazareno Romero | Coordinación de acceso e inventario. Verificación local del conjunto. |

Ambos revisaron etapas y probaron la demo publicada. Se usaron Codex y Claude para generar código y asistir en pruebas, revisiones y documentación.

## Descripción

Sistema web de inventario y reposición para pequeños comercios minoristas, como kioscos, almacenes, dietéticas y papeleras de barrio. Permite registrar entradas y salidas, consultar existencias, detectar productos bajo el mínimo y preparar listas de reposición por proveedor.

El MVP separa los datos por comercio y tiene dos roles. Dueño y empleado registran reposiciones y salidas. El dueño administra el catálogo, realiza ajustes y genera listas copiables o exportables en CSV.

La publicación usa un comercio con datos ficticios. Para probarla se necesita una cuenta habilitada por el equipo. Tras un período de inactividad, Render puede demorar en responder. Si ocurre, abrí el enlace de estado de la API y esperá a que indique `"database":"connected"` antes de iniciar sesión.

## Estado y entregas

| Instancia | Estado | Fecha |
|---|---|---|
| Entrega 1: propuesta y viabilidad | Aprobada por la tutora | 01/09/2026 (aprobación) |
| Entrega 2: diseño y módulos | Aprobada por la tutora; habilitada la implementación | 27/09/2026 (entrega); correcciones del 29/09 |
| Implementación y despliegue | Sistema publicado y probado online por ambos integrantes. Falta comprobar persistencia y restauración | 20/11/2026 (estado verificado) |
| Entrega final | PDF final y video en preparación. El piloto con un comercio real sigue pendiente | 21/11/2026 (fecha de referencia del equipo) |

La validación online incluyó catálogo, movimientos, alertas y exportación CSV, con controles distintos para dueño y empleado. Los resultados y las verificaciones pendientes están en el [registro de despliegue](docs/implementacion/despliegue.md).

## Stack definido

| Capa | Tecnología |
|---|---|
| Frontend | React con Vite, publicado en Vercel |
| Backend | Node.js 24 con Express, API REST publicada en Render |
| Base de datos | PostgreSQL en Neon |
| Acceso a datos | Prisma ORM 7 |

## Documentación

### Primera entrega

[Propuesta y viabilidad — documento presentado](docs/TFI_Entrega1_Anchorena_Romero.pdf). Se conserva como antecedente de lo entregado.

### Segunda entrega

| Archivo | Contenido |
|---|---|
| [01. Requerimientos y casos de uso](docs/segunda_entrega/01-requerimientos.md) | Objetivo, actores, alcance, RF/RNF, casos de uso, permisos y validación prevista. |
| [02. Reglas de negocio](docs/segunda_entrega/02-reglas-de-negocio.md) | RN-01 a RN-15, ejemplos y combinaciones de movimientos. |
| [03. Modelo de datos](docs/segunda_entrega/03-modelo-de-datos.md) | DER, diccionario, normalización, justificación del saldo almacenado, relaciones y restricciones. |
| [Esquema Prisma de la entrega](docs/segunda_entrega/schema.prisma) | Copia histórica del diseño. El esquema operativo está en backend/prisma. |
| [Restricciones SQL de la entrega](docs/segunda_entrega/restricciones.sql) | Siete CHECK, ya incorporados a la migración inicial del backend. |
| [04. Módulos y estructura](docs/segunda_entrega/04-modulos.md) | Backend, frontend, carpetas actuales, implementación prevista y secuencia de registrar un movimiento. |
| [Pruebas de PostgreSQL](docs/segunda_entrega/pruebas/README.md) | DDL generado desde Prisma, instrucciones, casos y salida real de la ejecución. |

Orden sugerido de lectura: requerimientos → reglas → modelo de datos → módulos. Los diagramas Mermaid están incluidos en los Markdown para consultarlos desde GitHub.

### Implementación

- [Backend](backend/README.md) y [frontend](frontend/README.md). Organización del código y responsabilidades de cada módulo.
- [Esquema Prisma vigente](backend/prisma/schema.prisma) y [migración inicial](backend/prisma/migrations/202610280001_initial/migration.sql).
- [Despliegue y verificación online](docs/implementacion/despliegue.md). Configuración, recorrido con ambos roles y procedimiento de recuperación.

## Alcance funcional del MVP

- Acceso autenticado, permisos por rol y separación de datos entre comercios.
- Productos con categoría, proveedor principal, unidad (`UNIDAD` o `KG`), stock mínimo y objetivo.
- Ingresos, egresos e historial; ajustes exclusivos del dueño.
- Baja lógica de productos y controles sobre categorías/proveedores activos.
- Alertas calculadas cuando el stock actual es menor al mínimo.
- Listas temporales de reposición por proveedor, editables, copiables y exportables en CSV por el dueño.

El desarrollo local tiene un seed y la publicación utiliza un script de preparación de cuentas de demo. La administración de cuentas, el registro público, la recuperación de contraseñas, los precios de venta, la facturación y el circuito de órdenes de compra quedan fuera del alcance. El detalle está en [requerimientos](docs/segunda_entrega/01-requerimientos.md).

## Estructura actual

```text
.
├── README.md
├── package.json                 # Comandos y workspaces
├── package-lock.json            # Dependencias reproducibles
├── docs/
│   ├── implementacion/         # Despliegue y evidencia técnica
│   ├── TFI_Entrega1_Anchorena_Romero.pdf
│   └── segunda_entrega/
│       ├── 01-requerimientos.md
│       ├── 02-reglas-de-negocio.md
│       ├── 03-modelo-de-datos.md
│       ├── 04-modulos.md
│       ├── schema.prisma
│       ├── restricciones.sql
│       └── pruebas/
├── backend/
│   ├── prisma/schema.prisma      # Fuente operativa del modelo
│   ├── prisma/seed.js
│   ├── prisma/migrations/
│   ├── src/server.js
│   ├── src/app.js
│   ├── src/modules/             # acceso, catalogo, inventario, reposicion
│   └── tests/
└── frontend/
    ├── src/app/                 # Estado de la sesión y estructura general
    ├── src/components/          # Componentes compartidos (estado de la conexión)
    ├── src/services/            # Comunicación con la API
    └── src/features/            # acceso, catalogo, inventario, reposicion
```

## Instalación y ejecución

Versión recomendada: **Node.js 24.22.1** y **PostgreSQL 18** (verificado con 18.6). `.nvmrc` y `.node-version` fijan esa recomendación. El rango de npm es `>=24.22.1 <25`: acepta versiones 24.x posteriores, pero rechaza Node 22, Node 25 y versiones anteriores al mínimo. Si usás NVM para Windows, ejecutá `nvm install 24.22.1` y `nvm use 24.22.1`; comprobá después `node --version` en una nueva terminal. No se necesita instalar Prisma globalmente.

Desde la raíz `stock-manager`:

1. Ejecutar `npm ci` y `npm run generate`.

   Nazareno reportó un aviso `install-scripts` / `allowScripts` sobre scripts no ejecutados de `@prisma/engines`, `esbuild` y `prisma`. En su instalación, la generación, las pruebas y la compilación funcionaron igualmente. Si aparece ese aviso, comprobar los resultados de los comandos siguientes; no habilitar todos los scripts automáticamente. El aviso no está incluido en la salida guardada, por lo que esta nota registra lo informado por Nazareno.

2. Copiar `backend/.env.example` a `backend/.env` **solo si no existe**. Completar la conexión a PostgreSQL, las contraseñas del seed y `JWT_SECRET` (el comando para generarlo está en el ejemplo). El backend exige `JWT_SECRET` y la sesión dura ocho horas por defecto. No subir este archivo. `frontend/.env.example` es opcional en desarrollo porque el proxy local ya está configurado.

   En Windows, guardar, cerrar el editor y volver a abrir el archivo exacto con `notepad backend/.env`, desde la raíz del proyecto. Comprobar localmente que quedaron los valores editados y que no se guardó como `.env.txt`. Ante un error de autenticación `P1000`, revisar también que los cambios se hayan guardado y que la conexión corresponda al usuario, contraseña y servidor elegidos. No pegar el contenido del `.env` en chats ni incluirlo en capturas o registros de pruebas.
3. Crear dos bases vacías con el usuario administrador de la instalación:

   ```powershell
   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE stock_manager;"
   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE stock_manager_test;"
   ```

   En Windows, si `psql` no está en PATH, reemplazarlo por `& 'C:\Program Files\PostgreSQL\18\bin\psql.exe'`. La contraseña es la elegida al instalar PostgreSQL. Si una base ya existe, inspeccionarla antes de continuar: no borrar ni reutilizar datos de otro proyecto.

4. Ejecutar `npm run db:migrate`. Verificar que `DATABASE_URL` apunta al desarrollo y habilitar `ALLOW_DEMO_SEED=true` en `backend/.env`; después ejecutar `npm run db:seed`. El valor de ejemplo es `false` para exigir esta decisión explícita. La migración ya incluye los CHECK: **no ejecutar restricciones.sql otra vez** sobre estas bases.
5. Ejecutar `npm run dev`. Abrir **http://localhost:5173** e ingresar con una cuenta del seed. La API usa el puerto 3001; en el inicio debe aparecer que la conexión está lista. `Ctrl+C` detiene ambos servidores.

El seed crea dos comercios ficticios, una categoría y proveedor por comercio, y las cuentas `dueno.a@example.invalid`, `empleado.a@example.invalid`, `dueno.b@example.invalid` y `empleado.b@example.invalid`. Usa `SEED_OWNER_PASSWORD` y `SEED_EMPLOYEE_PASSWORD`, de al menos 12 caracteres y hasta 72 bytes, para guardar hashes. Se puede repetir: no duplica registros ni restablece contraseñas existentes. El seed de demostración requiere `ALLOW_DEMO_SEED=true` y se bloquea siempre con `NODE_ENV=production`, incluso si está habilitado. La habilitación no identifica automáticamente qué base es de producción: revisar siempre la conexión elegida. Para ingresar se usan esas cuentas con la contraseña del seed correspondiente a su rol.

| Comando desde la raíz | Uso |
|---|---|
| `npm run dev` | Inicia frontend y backend con recarga. |
| `npm run generate` | Regenera el cliente después de cambios en el esquema. |
| `npm run db:migrate` | Aplica migraciones pendientes, incluidos los CHECK. |
| `npm run db:seed` | Carga datos de demostración en desarrollo. |
| `npm test` | Pruebas de lógica y HTTP con base simulada. |
| `npm run test:integration` | Inspecciona antes de migrar la base exclusiva `stock_manager_test`. Rechaza datos y objetos ajenos; después migra, prueba y limpia sus fixtures. |
| `npm run build` | Genera el cliente Prisma y compila el frontend en `frontend/dist`. |
| `npm start` | Inicia solo la API mediante tsx. |

## Pruebas y evidencia

Las pruebas de integración usan `TEST_DATABASE_URL` para conectarse a la base exclusiva `stock_manager_test`. Cubren migración y seed, permisos por rol y comercio, egresos concurrentes, rollback de movimientos, alertas y fechas.

| Verificación | Resultado | Evidencia |
|---|---|---|
| Diseño SQL · 29/09/2026 | 32 casos correctos y siete restricciones CHECK. | [Pruebas del esquema](docs/segunda_entrega/pruebas/README.md) |
| Instalación limpia · 29/10/2026 | En Windows con Node 24.22.1 y PostgreSQL 18.6 se aplicó la migración en dos bases vacías, se repitió el seed sin duplicados y pasaron 14 pruebas unitarias y de HTTP, 5 de integración y el build. El runner también rechazó bases con datos u objetos ajenos. | [Salida de la instalación](docs/implementacion/resultados-instalacion-final-2026-10-29.txt) |
| Instalación de Nazareno · 30/10/2026 | Migración desde cero, seed repetido, 14 pruebas unitarias y de HTTP, 5 de integración en dos ejecuciones y build correcto. | [Salida en otro equipo](docs/implementacion/instalacion-nazareno-2026-10-30.txt) |
| Verificación final · 20/11/2026 | 42/42 pruebas unitarias y de HTTP, 25/25 de integración sobre una base recién migrada y compilación correcta. Tomás y Nazareno probaron en producción con dueño y empleado. | [Resultados y pendientes](docs/implementacion/despliegue.md#prueba-cruzada-online--20112026) |

### Si se interrumpió una prueba

El rechazo por datos existentes es intencional: el runner no los borra automáticamente. Primero cerrá las pruebas en ejecución y revisá el host, puerto y nombre de `TEST_DATABASE_URL`. Si hay datos desconocidos o que quieras conservar, no continúes con el borrado.

Solo si confirmaste que **stock_manager_test es exclusivamente descartable**, podés recrearla. Este ejemplo corresponde a la instalación local del README (ajustar host/puerto/usuario a esa base de pruebas, nunca a desarrollo o producción):

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE stock_manager_test;"
psql -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE stock_manager_test;"
npm run test:integration
```

Si hay conexiones abiertas, PostgreSQL rechazará el borrado; cerralas antes de reintentar. No usar `--force` ni cambiar el nombre por `stock_manager`. La nueva ejecución vuelve a aplicar la migración. Ejecutar las pruebas de a una sobre esa base dedicada; no compartirla con una aplicación en uso.

## Registro de cambios

- **Septiembre de 2026.** Se aprobó la propuesta y se completó el diseño. Las correcciones documentaron la normalización y el stock derivado, incorporaron CSV y verificaron el esquema en PostgreSQL.
- **Octubre de 2026.** Se preparó el entorno, se versionó la migración y se verificó la instalación desde cero en dos equipos.
- **5 al 14 de noviembre de 2026.** Se incorporaron acceso, catálogo, movimientos, alertas y reposición. Se integraron las correcciones de las revisiones cruzadas.
- **18 al 20 de noviembre de 2026.** Se corrigió el manejo de la zona horaria, se publicó el sistema y se verificó online con ambos roles.
