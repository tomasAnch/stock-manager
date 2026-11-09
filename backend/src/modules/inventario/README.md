# Inventario

La etapa 3 incorpora registrarMovimiento(tx, auth, data, opciones), usada por Catálogo para STOCK_INICIAL. Recibe una transacción abierta y bloquea el producto antes de actualizar saldo e insertar movimiento. No publica rutas; las pantallas, endpoints e historial se implementan en la etapa 4. No habilitar STOCK_INICIAL desde entradas del cliente.
