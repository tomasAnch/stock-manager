# Prueba del esquema y las restricciones en PostgreSQL

Corrección de la Entrega 2 · 29/09/2026.

Se generaron las tablas desde el esquema Prisma, se aplicaron los CHECK y se ejecutaron casos con datos ficticios en una base nueva. **Las 32 comprobaciones finalizaron correctamente.** La salida completa está en [resultados-postgresql.txt](resultados-postgresql.txt), incluida la fecha de ejecución, versión del motor y definición de cada CHECK instalado.

## Entorno y archivos

| Dato | Valor utilizado |
|---|---|
| PostgreSQL | 18.6, Windows x86-64 |
| Base exclusiva | `tfi_entrega2_pruebas` |
| Ejecución | 29/09/2026; hora exacta en la salida |
| Zona horaria de la sesión | America/Argentina/Buenos_Aires |
| Prisma CLI para validar y generar el DDL | 7.0.0 |
| Node.js para ejecutar esa CLI | 24.19.0 |

La ejecución se hizo con asistencia de Codex en una instancia local de prueba, separada del servicio habitual. No se utilizaron datos de comercios ni credenciales reales del proyecto. No se probó una API Prisma: se ejecutó en PostgreSQL el SQL que generó la CLI.

| Archivo | Función |
|---|---|
| [00-ejecutar.sql](00-ejecutar.sql) | Ejecuta todos los pasos con `psql` y se detiene ante errores. |
| [01-esquema-generado.sql](01-esquema-generado.sql) | DDL generado con `prisma migrate diff` desde [schema.prisma](../schema.prisma), sin adaptar las tablas manualmente. |
| [restricciones.sql](../restricciones.sql) | Complemento original de siete CHECK; se aplica después del DDL. |
| [02-inspeccionar.sql](02-inspeccionar.sql) | Lista tablas y CHECK de las tablas del proyecto; comprueba que los siete estén validados. |
| [03-casos.sql](03-casos.sql) | Casos de aceptación y rechazo; conciliación de saldos. |
| [resultados-postgresql.txt](resultados-postgresql.txt) | Salida de la ejecución completa que terminó sin fallos. |

## Cómo repetir la prueba

Requiere PostgreSQL y su cliente `psql`. Estos comandos se ejecutan desde la raíz del repositorio, con `psql` disponible en PATH. Usar un servidor de desarrollo y un usuario con permiso para crear una base; reemplazar `postgres` y el puerto si la instalación usa otros valores. La contraseña, si se solicita, se introduce en el terminal y no se guarda en los archivos.

1. Crear una base nueva dedicada a la prueba:

   ```powershell
   psql -X -h localhost -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE tfi_entrega2_pruebas;"
   ```

2. Aplicar el esquema, los CHECK y los casos:

   ```powershell
   psql -X -h localhost -p 5432 -U postgres -d tfi_entrega2_pruebas -v ON_ERROR_STOP=1 -f docs/segunda_entrega/pruebas/00-ejecutar.sql
   ```

   En PowerShell, `$LASTEXITCODE` debe devolver `0`. La salida debe mostrar siete CHECK validados, 32 casos correctos, cero productos ficticios restantes y el mensaje final sin fallos. El código de salida importa: un rechazo esperado dentro de un caso cuenta como éxito; un error inesperado detiene el script.

El ejecutor verifica el nombre de la base y que no existan tablas ni enums de aplicación en `public`. Si la base ya existe con objetos, no los borra. Después de la primera ejecución, se pueden repetir solo los casos con `-f docs/segunda_entrega/pruebas/03-casos.sql`, conservando la opción `-v ON_ERROR_STOP=1` y los parámetros de conexión anteriores.

El orden comprobado es **DDL generado → restricciones.sql → inspección → casos**. `migrate diff` no genera estos CHECK. Se usan `\ir` y otras instrucciones de `psql`; el ejecutor completo no está pensado para pegarse en el editor SQL de Supabase o pgAdmin.

Los casos crean datos ficticios dentro de una transacción y terminan con `ROLLBACK`. Quedan instaladas las tablas y las restricciones, pero no los productos ni movimientos de prueba. Los UUID de las inserciones se asignan explícitamente o mediante `gen_random_uuid()`: `@default(uuid())` del esquema es una generación de Prisma, no un DEFAULT de PostgreSQL en este DDL.

## Qué se verificó

- Se crean las seis tablas y quedan instalados y validados los siete CHECK.
- Se aceptan kg decimales y códigos/nombres iguales cuando pertenecen a comercios distintos.
- Se rechazan saldos o mínimos negativos, objetivo menor al mínimo y stocks fraccionarios en productos por unidad.
- Se rechazan códigos, nombres normalizados y correos duplicados según las restricciones únicas.
- Se rechazan movimientos no positivos, combinaciones incompatibles de tipo/motivo y ajustes sin explicación.
- Se rechazan referencias inexistentes y el borrado de un producto con movimientos. El borrado con `RESTRICT` devuelve SQLSTATE `23001`; una referencia inexistente devuelve `23503`.
- Se comprueban ejemplos de sugerencia, igualdad al mínimo y mínimo cero.
- Un egreso válido descuenta; un egreso excesivo y un ingreso sobre un producto inactivo no actualizan filas con las condiciones previstas.
- Si falla la inserción del movimiento después de actualizar el saldo, el bloque transaccional restaura ambos. Se utiliza un subbloque de PL/pgSQL, que revierte sus escrituras al capturar el error.
- Al finalizar las operaciones, los cuatro productos de prueba tienen un saldo almacenado igual a ingresos menos egresos. Luego se revierten todos los datos ficticios.

## Límites de esta evidencia

Estas son pruebas del esquema y de operaciones SQL, no una aplicación terminada. No comprueban todavía login, permisos HTTP, validación de unidad de un movimiento en el backend, normalización de texto en JavaScript, copia/descarga de CSV ni tiempos del piloto. Tampoco simulan dos sesiones concurrentes; ese caso sigue previsto para la implementación. Las reglas que dependen del backend se mantienen identificadas en [el modelo de datos](../03-modelo-de-datos.md#dónde-se-garantiza-cada-regla).

## Generación del DDL

Se ejecutó `prisma validate` sobre el esquema documental y luego la CLI 7.0.0 con estos argumentos, desde la raíz del repositorio:

```text
prisma migrate diff --config <configuracion-temporal.ts> --from-empty --to-schema docs/segunda_entrega/schema.prisma --script --output docs/segunda_entrega/pruebas/01-esquema-generado.sql
```

La configuración temporal, ubicada junto a la instalación de Prisma usada para verificar, contenía:

```ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: 'postgresql://verification:verification@127.0.0.1:1/verification',
  },
});
```

Esa URL es ficticia: la comparación desde vacío contra el archivo no se conecta a una base. La conexión a la base real se realizó después mediante `psql`. No se ejecutó `prisma generate` ni se incorporó un cliente generado a la documentación. Para repetir la prueba de restricciones alcanza con los SQL guardados; no hace falta instalar Prisma.
