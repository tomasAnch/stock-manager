# Sistema de Control de Stock para Comercios Minoristas

Trabajo Final Integrador — Tecnicatura Universitaria en Programación, UTN.

## Integrantes

- Tomás Anchorena
- Nazareno Romero

## Descripción

Sistema web de inventario y reposición para pequeños comercios minoristas, como kioscos, almacenes, dietéticas y papeleras de barrio. Permite registrar entradas y salidas, consultar existencias, detectar productos bajo el mínimo y preparar listas de reposición por proveedor.

El MVP contempla uno o dos comercios piloto, con datos separados por comercio y dos roles: dueño y empleado. Ambos registran reposiciones y salidas; el dueño administra el catálogo, realiza ajustes y genera las listas copiables o exportables en CSV. No incluye facturación, pagos ni órdenes con seguimiento.

## Estado y entregas

| Instancia | Estado | Fecha |
|---|---|---|
| Entrega 1: propuesta y viabilidad | Aprobada por la tutora | 01/09/2026 (aprobación) |
| Entrega 2: diseño y módulos | Aprobada por la tutora; habilitada la implementación | 27/09/2026 (entrega); correcciones del 29/09 |
| Implementación y entrega final | Etapa 1 cerrada tras revisión e instalación en ambos equipos; funciones del MVP pendientes | 14/11/2026 (fecha límite) |

El proyecto ya tiene una base ejecutable: frontend React, servidor Express, cliente Prisma, migración inicial y seed de desarrollo. La pantalla de inicio comprueba la conexión con PostgreSQL. Login, catálogo, movimientos y reposición se implementarán en las etapas siguientes; la descripción funcional de abajo corresponde al MVP completo previsto.

## Stack definido

| Capa | Tecnología |
|---|---|
| Frontend | React |
| Backend | Node.js + Express, API REST |
| Base de datos | PostgreSQL |
| Acceso a datos | Prisma ORM 7 |
| Despliegue previsto | Render/Vercel; PostgreSQL en Supabase o Render, a confirmar durante la implementación |

Para la entrega final, el campus exige al menos un componente principal alojado y funcionando online.

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

[Hoja de ruta de desarrollo](docs/plan-desarrollo.md): etapas, checklist y registro de avance. [Etapa 1: funcionamiento y revisión](docs/implementacion/etapa-1.md): explicación, comprobaciones y límites de lo implementado. [Preparación del despliegue](docs/implementacion/despliegue.md): configuración prevista; todavía no hay un despliegue público.

## Alcance funcional del MVP

- Acceso autenticado, permisos por rol y separación de datos entre comercios.
- Productos con categoría, proveedor principal, unidad (`UNIDAD` o `KG`), stock mínimo y objetivo.
- Ingresos, egresos e historial; ajustes exclusivos del dueño.
- Baja lógica de productos y controles sobre categorías/proveedores activos.
- Alertas calculadas cuando el stock actual es menor al mínimo.
- Listas temporales de reposición por proveedor, editables, copiables y exportables en CSV por el dueño.

Los comercios y usuarios piloto se cargarán mediante un seed. No se incluyen ABM de cuentas, registro público, recuperación de contraseñas, precios de venta, facturación ni circuitos de compras. El detalle y las exclusiones están en [requerimientos](docs/segunda_entrega/01-requerimientos.md).

## Estructura actual

```text
.
├── README.md
├── package.json                 # Comandos y workspaces
├── package-lock.json            # Dependencias reproducibles
├── docs/
│   ├── plan-desarrollo.md
│   ├── implementacion/
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
    ├── src/app/                 # Pantalla de conexión
    ├── src/services/            # Comunicación con la API
    └── src/features/            # acceso, catalogo, inventario, reposicion
```

Los README de [backend](backend/README.md) y [frontend](frontend/README.md) explican el estado de cada parte. Los documentos de la segunda entrega se conservan como antecedente del diseño; la implementación vigente se registra en esta sección.

## Instalación y ejecución

Versión recomendada: **Node.js 24.22.1** y **PostgreSQL 18** (verificado con 18.6). `.nvmrc` y `.node-version` fijan esa recomendación. El rango de npm es `>=24.22.1 <25`: acepta versiones 24.x posteriores, pero rechaza Node 22, Node 25 y versiones anteriores al mínimo. Si usás NVM para Windows, ejecutá `nvm install 24.22.1` y `nvm use 24.22.1`; comprobá después `node --version` en una nueva terminal. No se necesita instalar Prisma globalmente.

Desde la raíz `stock-manager`:

1. Ejecutar `npm ci` y `npm run generate`.

   Nazareno reportó un aviso `install-scripts` / `allowScripts` sobre scripts no ejecutados de `@prisma/engines`, `esbuild` y `prisma`. En su instalación, la generación, las pruebas y la compilación funcionaron igualmente. Si aparece ese aviso, comprobar los resultados de los comandos siguientes; no habilitar todos los scripts automáticamente. El aviso no está incluido en la salida guardada, por lo que esta nota registra lo informado por Nazareno.

2. Copiar `backend/.env.example` a `backend/.env` **solo si no existe**. Completar la conexión a PostgreSQL y las contraseñas del seed. No subir este archivo. `frontend/.env.example` es opcional en desarrollo porque el proxy local ya está configurado.

   En Windows, guardar, cerrar el editor y volver a abrir el archivo exacto con `notepad backend/.env`, desde la raíz del proyecto. Comprobar localmente que quedaron los valores editados y que no se guardó como `.env.txt`. Ante un error de autenticación `P1000`, revisar también que los cambios se hayan guardado y que la conexión corresponda al usuario, contraseña y servidor elegidos. No pegar el contenido del `.env` en chats ni incluirlo en capturas o registros de pruebas.
3. Crear dos bases vacías con el usuario administrador de la instalación:

   ```powershell
   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE stock_manager;"
   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE stock_manager_test;"
   ```

   En Windows, si `psql` no está en PATH, reemplazarlo por `& 'C:\Program Files\PostgreSQL\18\bin\psql.exe'`. La contraseña es la elegida al instalar PostgreSQL. Si una base ya existe, inspeccionarla antes de continuar: no borrar ni reutilizar datos de otro proyecto.

4. Ejecutar `npm run db:migrate`. Verificar que `DATABASE_URL` apunta al desarrollo y habilitar `ALLOW_DEMO_SEED=true` en `backend/.env`; después ejecutar `npm run db:seed`. El valor de ejemplo es `false` para exigir esta decisión explícita. La migración ya incluye los CHECK: **no ejecutar restricciones.sql otra vez** sobre estas bases.
5. Ejecutar `npm run dev`. Abrir **http://localhost:5173**. La API usa el puerto 3001; la pantalla debe indicar que la conexión está lista. `Ctrl+C` detiene ambos servidores.

El seed crea dos comercios ficticios, una categoría y proveedor por comercio, y las cuentas `dueno.a@example.invalid`, `empleado.a@example.invalid`, `dueno.b@example.invalid` y `empleado.b@example.invalid`. Usa `SEED_OWNER_PASSWORD` y `SEED_EMPLOYEE_PASSWORD`, de al menos 12 caracteres y hasta 72 bytes, para guardar hashes. Se puede repetir: no duplica registros ni restablece contraseñas existentes. El seed de demostración requiere `ALLOW_DEMO_SEED=true` y se bloquea siempre con `NODE_ENV=production`, incluso si está habilitado. La habilitación no identifica automáticamente qué base es de producción: revisar siempre la conexión elegida. Todavía no hay pantalla de login.

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

Las pruebas de integración exigen `TEST_DATABASE_URL`, distinta de desarrollo; nunca toman `DATABASE_URL` como reemplazo. Esta etapa no verifica todavía la autorización ni los movimientos concurrentes del futuro MVP. La evidencia histórica de las 32 comprobaciones SQL de septiembre sigue en [segunda entrega](docs/segunda_entrega/pruebas/README.md).

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

### 30/10/2026 — Instalación de Nazareno y cierre de la etapa 1

- Se incorpora la [salida enviada por Nazareno](docs/implementacion/instalacion-nazareno-2026-10-30.txt) sobre el commit `501810c` y su [captura de conexión](docs/implementacion/instalacion-nazareno-2026-10-30.png). Registra migraciones, seed repetido, 14 pruebas de lógica/HTTP, 5 de integración en dos ejecuciones y compilación correcta.
- Se aclaran el aviso de instalación reportado y la comprobación del guardado del `.env`. Se actualiza la hoja de ruta: la siguiente etapa es acceso y permisos.

### 29/10/2026 — Revisión de la etapa 1

- Se agregan mensajes controlados para errores, habilitación explícita del seed y una inspección de la base de pruebas anterior a las migraciones.
- Se precisa el CHECK esperado en las pruebas, se simplifica código y se documenta la recuperación de pruebas interrumpidas.
- Se conserva la migración aplicada y la evidencia del 28/10. La nueva verificación desde una copia limpia se registra por separado en [la revisión](docs/implementacion/revision-etapa-1.md).

### 28/10/2026 — Preparación de la implementación

- Se actualiza el estado de la segunda entrega a aprobada por la tutora, según la devolución compartida por el equipo, que habilita comenzar la implementación.
- Se incorpora una hoja de ruta para implementar y probar el MVP por etapas, incluyendo despliegue, piloto, informe y video. No cambia el alcance funcional ni reemplaza las consignas del campus.
- Se implementa la etapa 1 con Node 24.22.1, Prisma 7.10.1 y dependencias fijadas en el lockfile. Se agregan aplicación mínima, migración con CHECK, seed repetible, validaciones comunes y pruebas. Los módulos funcionales del MVP siguen pendientes.

### 29/09/2026 — Correcciones a partir de la devolución

- Se incorpora el análisis de normalización: 3FN bajo las reglas definidas, con excepciones justificadas a FNBC en categorías, proveedores y productos. Se incluyen claves candidatas y dependencias.
- Se explica `stock_actual` como desnormalización deliberada: permite comprobar y actualizar el saldo sobre una fila, a cambio de mantenerlo junto con cada movimiento en una transacción. Se agrega una consulta de conciliación con el historial.
- Se aplica en PostgreSQL el DDL generado desde el esquema y luego `restricciones.sql`. Se guardan los scripts y la salida de 32 comprobaciones correctas, junto con la versión y la fecha reales.
- Se crean `backend/` y `frontend/` con los módulos documentados y directorios auxiliares. Todavía no contienen una aplicación ejecutable.
- Se reincorpora la exportación CSV a partir de la devolución de la tutora, además de copiar texto. Se actualizan alcance, RF-12, CU-08, RN-14, permisos y módulos. Se define su formato para uso con configuración regional argentina.

Respecto de las órdenes, la primera propuesta las describía como un “listado exportable o copiable con los productos faltantes clasificados para enviar a proveedores”. En el diseño concretamos ese resultado como una lista calculada por proveedor: se puede editar y enviar fuera del sistema, pero no tiene seguimiento de aprobación, envío o recepción dentro de la aplicación. Elegimos ese límite porque el problema abordado es detectar faltantes y preparar la reposición; el stock se actualiza al recibir mercadería, mediante un movimiento independiente. Guardar órdenes y administrar estados incorporaría un circuito de compras que no se desarrolló en la propuesta. Dejamos explícita esta decisión para la revisión de la tutora.

El 24/09 se había seleccionado solo la copia de texto entre las dos salidas previstas. Con esta corrección se ofrecen ambas. El CSV puede conservarse fuera de la aplicación, aunque la lista de trabajo sea temporal. La entrada del 24/09 se mantiene como registro de lo decidido en esa fecha.

### 24/09/2026 — Diseño y módulos

Los siguientes cambios son precisiones y decisiones del equipo respecto de la primera entrega; no se atribuyen a observaciones particulares de la tutora:

- Se completa el modelo con Comercio, Usuario, Categoria y Proveedor, además de Producto y MovimientoStock. Se reemplaza el término documental “colecciones” por “tablas” en el diseño vigente.
- Se concreta la separación de datos por comercio. MovimientoStock obtiene el comercio a través del producto, evitando repetir ese campo. Se explicita que las FK simples requieren controles adicionales de comercio en el backend.
- Se precisan roles y acceso: dueño y empleado registran operaciones habituales; el dueño administra catálogo, registra ajustes y genera reposición. No se desarrolla una pantalla de aprobación de pedidos.
- “Órdenes de compra/reposición” se concreta como listas calculadas y copiables por proveedor, sin persistencia, estados ni exportación CSV. El envío se realiza fuera de la aplicación.
- Se agrega stock objetivo para calcular cantidades sugeridas. Se conserva el criterio de alerta “por debajo del mínimo” de la primera entrega, incluyendo mínimo cero como desactivación de alertas.
- Se incorporan unidad de medida y cantidades decimales para kg; los productos por unidad conservan cantidades enteras.
- Se definen stock inicial, ajustes con motivo, historial inmutable, bajas lógicas y controles de reactivación. Se especifican transacciones y operaciones condicionales para mantener el saldo.
- Se excluye el precio de venta, mencionado en la descripción inicial del actor dueño: no interviene en las funcionalidades de inventario y reposición comprometidas.
- Se definen nombres normalizados de categorías/proveedores: espacios normalizados y minúsculas para unicidad, conservando tildes. Se documentan controles SQL y validaciones de aplicación por separado.
- Se actualiza el estado de la primera entrega y se corrige el enlace al PDF. La descripción del piloto se unifica en uno o dos comercios, conforme a la propuesta presentada.
- Se define JavaScript con módulos ES para el backend y tsx para ejecutar el cliente TypeScript que genera Prisma 7.

El PDF de la primera entrega se conserva tal como fue presentado.
