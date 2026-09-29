# Catálogo

Implementará RF-03 a RF-06: administración de categorías, proveedores y productos, normalización de nombres y códigos, umbrales, bajas y reactivaciones. Verificará que las referencias pertenezcan al comercio autorizado y estén activas cuando corresponda.

El alta con stock inicial abrirá una transacción y utilizará la lógica de Inventario con el mismo cliente transaccional. Si falla el movimiento inicial, también se revierte el alta. Editar un producto no permitirá sobrescribir su saldo.

Estado: carpeta creada; rutas, validaciones y servicios pendientes de implementación. Ver [reglas de negocio](../../../../docs/segunda_entrega/02-reglas-de-negocio.md).
