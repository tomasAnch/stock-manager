# Sistema de Control de Stock para Comercios Minoristas

Trabajo Integrador Final — Tecnicatura Universitaria en Programación (UTN)

## Integrantes

- Tomás Anchorena
- Nazareno Romero

## Descripción del proyecto

Sistema web de control de inventario y reposición para pequeños comercios minoristas (kioscos, almacenes, dietéticas, papeleras de barrio). Reemplaza el conteo manual y los pedidos informales por WhatsApp con un registro centralizado de stock en tiempo real, alertas automáticas de stock crítico y generación de listas de reposición para proveedores.

El detalle completo de la problemática, el stack elegido, el alcance del MVP y el análisis de viabilidad está en el documento de la primera entrega: [`docs/Entrega1_Propuesta_y_Viabilidad.pdf`](./docs/TFI_Entrega1_Anchorena_Romero).

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL + Prisma (ORM) |
| Despliegue | Render / Vercel |

## Alcance del MVP (Entrega 1)

- Gestión de catálogo de productos (alta, baja, modificación)
- Registro de movimientos de stock (ingresos y egresos)
- Panel de alertas de stock crítico.
- Generador de órdenes de compra/reposición

El modelo de datos se diseña preparado para múltiples comercios (multi-tenant) a futuro, aunque el MVP de esta entrega se valida con un solo comercio piloto.

## Estado del proyecto

🟡 **Entrega 1 — Propuesta y Viabilidad**: en curso (fecha límite 30/08/2026)

## Estructura del repositorio

```
.
├── README.md
├── docs/
│   └── TFI_Entrega1_Anchorena_Romero.pdf
├── backend/        (próximamente — Entrega 2)
└── frontend/        (próximamente — Entrega 2)
```
