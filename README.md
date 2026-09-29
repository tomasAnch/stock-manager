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
| Entrega 2: diseño y módulos | Correcciones preparadas; pendiente de revisión final de la tutora y del comité | 27/09/2026 (entrega); corrección del 29/09, plazo hasta el 01/10 por la noche |
| Implementación y entrega final | Pendiente | 14/11/2026 (fecha límite) |

El repositorio contiene la propuesta, el diseño corregido, pruebas ejecutadas en PostgreSQL y las carpetas de módulos de backend y frontend. La lógica de la aplicación se desarrollará en la etapa de implementación.

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
| [Esquema Prisma](docs/segunda_entrega/schema.prisma) | Modelos, enums, relaciones e índices del diseño para Prisma 7. |
| [Restricciones SQL complementarias](docs/segunda_entrega/restricciones.sql) | Siete CHECK aplicados y probados en PostgreSQL; se incorporarán a la primera migración. |
| [04. Módulos y estructura](docs/segunda_entrega/04-modulos.md) | Backend, frontend, carpetas actuales, implementación prevista y secuencia de registrar un movimiento. |
| [Pruebas de PostgreSQL](docs/segunda_entrega/pruebas/README.md) | DDL generado desde Prisma, instrucciones, casos y salida real de la ejecución. |

Orden sugerido de lectura: requerimientos → reglas → modelo de datos → módulos. Los diagramas Mermaid están incluidos en los Markdown para consultarlos desde GitHub.

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
├── docs/
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
│   ├── prisma/migrations/
│   ├── src/modules/             # acceso, catalogo, inventario, reposicion
│   └── tests/
└── frontend/
    └── src/features/            # acceso, catalogo, inventario, reposicion
```

Los README de [backend](backend/README.md) y [frontend](frontend/README.md) explican cada módulo. La [estructura detallada](docs/segunda_entrega/04-modulos.md#estructura-actual-de-la-entrega) distingue las carpetas creadas de los archivos que se incorporarán al programar.

## Instalación y ejecución

Todavía no hay una aplicación para instalar. Cuando comience la implementación se documentarán las versiones de Node.js, la instalación de dependencias, las variables de entorno de ejemplo, las migraciones, el seed y los comandos para ejecutar cada parte. No se suben credenciales ni archivos `.env` reales.

El esquema se validó con Prisma 7.0.0. El 29/09 se aplicaron su DDL y los siete CHECK en PostgreSQL 18.6: pasaron 32 comprobaciones de restricciones y operaciones SQL. Los [scripts y resultados](docs/segunda_entrega/pruebas/README.md) permiten repetir la prueba en una base vacía. Esto no reemplaza los [casos de integración previstos para la aplicación](docs/segunda_entrega/04-modulos.md#verificaciones-previstas-durante-la-implementación).

## Registro de cambios

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
