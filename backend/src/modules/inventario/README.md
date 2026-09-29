# Inventario

Implementará RF-07 a RF-09 y colaborará con RF-04: ingresos, egresos, ajustes e historial por producto. Validará cantidades, unidad, motivo y permisos; los ajustes serán exclusivos del dueño.

Actualizará saldo y movimiento dentro de una misma transacción. El egreso se condicionará a saldo suficiente; tanto ingresos como egresos exigirán producto activo y del comercio autorizado. No ofrecerá edición ni borrado de movimientos.

Estado: carpeta creada; implementación pendiente. La estrategia de bloqueo, actualización condicional y reversión está en [modelo de datos](../../../../docs/segunda_entrega/03-modelo-de-datos.md#operaciones-transaccionales).
