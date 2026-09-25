# Sistema de Control de Stock para Comercios Minoristas

Trabajo Final Integrador — Tecnicatura Universitaria en Programación, UTN.

## Integrantes

- Tomás Anchorena
- Nazareno Romero

## Descripción

Sistema web de inventario y reposición para pequeños comercios minoristas, como kioscos, almacenes, dietéticas y papeleras de barrio. Permite registrar entradas y salidas, consultar existencias, detectar productos bajo el mínimo y preparar listas de reposición por proveedor.

El MVP contempla uno o dos comercios piloto, con datos separados por comercio y dos roles: dueño y empleado. Ambos registran reposiciones y salidas; el dueño administra el catálogo, realiza ajustes y genera las listas copiables. No incluye facturación, pagos ni órdenes con seguimiento.

## Estado y entregas

| Instancia | Estado | Fecha |
|---|---|---|
| Entrega 1: propuesta y viabilidad | Aprobada por la tutora | 01/09/2026 (aprobación) |
| Entrega 2: diseño y módulos | Pendiente de aprobación de la tutora y del comité | 27/09/2026 (fecha límite) |
| Implementación y entrega final | Pendiente | 14/11/2026 (fecha límite) |

Por ahora el repositorio contiene la propuesta y el diseño; el código del frontend y del backend se incorpora a partir de la etapa de implementación.

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
| [03. Modelo de datos](docs/segunda_entrega/03-modelo-de-datos.md) | DER en Mermaid, diccionario, relaciones, índices, restricciones y decisiones de diseño. |
| [Esquema Prisma](docs/segunda_entrega/schema.prisma) | Modelos, enums, relaciones e índices del diseño para Prisma 7. |
| [Restricciones SQL complementarias](docs/segunda_entrega/restricciones.sql) | CHECK previstos para incorporar a la primera migración; no es un instalador completo. |
| [04. Módulos y estructura](docs/segunda_entrega/04-modulos.md) | Backend, frontend, estructura prevista y secuencia de registrar un movimiento. |

Orden sugerido de lectura: requerimientos → reglas → modelo de datos → módulos. Los diagramas Mermaid están incluidos en los Markdown para consultarlos desde GitHub.

## Alcance funcional del MVP

- Acceso autenticado, permisos por rol y separación de datos entre comercios.
- Productos con categoría, proveedor principal, unidad (`UNIDAD` o `KG`), stock mínimo y objetivo.
- Ingresos, egresos e historial; ajustes exclusivos del dueño.
- Baja lógica de productos y controles sobre categorías/proveedores activos.
- Alertas calculadas cuando el stock actual es menor al mínimo.
- Listas temporales de reposición por proveedor, editables y copiables por el dueño.

Los comercios y usuarios piloto se cargarán mediante un seed. No se incluyen ABM de cuentas, registro público, recuperación de contraseñas, precios de venta, CSV, facturación ni circuitos de compras. El detalle y las exclusiones están en [requerimientos](docs/segunda_entrega/01-requerimientos.md).

## Estructura actual

```text
.
├── README.md
└── docs/
    ├── TFI_Entrega1_Anchorena_Romero.pdf
    └── segunda_entrega/
        ├── 01-requerimientos.md
        ├── 02-reglas-de-negocio.md
        ├── 03-modelo-de-datos.md
        ├── schema.prisma
        ├── restricciones.sql
        └── 04-modulos.md
```

La implementación posterior incorporará `backend/` y `frontend/` dentro de este mismo repositorio. La [estructura propuesta](docs/segunda_entrega/04-modulos.md#estructura-prevista-al-implementar) distingue lo previsto de los archivos existentes.

## Instalación y ejecución

Todavía no hay una aplicación para instalar. Cuando comience la implementación se documentarán las versiones de Node.js, la instalación de dependencias, las variables de entorno de ejemplo, las migraciones, el seed y los comandos para ejecutar cada parte. No se suben credenciales ni archivos `.env` reales.

El esquema se validó con Prisma 7 y se comprobó la sintaxis de los diagramas. Los casos de prueba previstos para la aplicación están en [módulos](docs/segunda_entrega/04-modulos.md#verificaciones-previstas-durante-la-implementación).

## Registro de cambios

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
