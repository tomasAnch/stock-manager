# Alertas y reposición

Implementa RF-10 a RF-12: productos activos por debajo del mínimo y, para el dueño, cantidades sugeridas agrupadas por proveedor. La sugerencia es stock objetivo menos stock actual.

Solo lee el inventario. No guarda alertas ni órdenes, no reserva stock ni registra compras. El frontend mantiene las ediciones temporales y genera las salidas de texto y CSV con los datos autorizados.

`reposicion.routes.js` expone `GET /api/reposicion/alertas` para ambos roles y `GET /api/reposicion/lista` solo para el dueño. Reutiliza autenticación y rol vigente de la etapa 2. `reposicion.service.js` consulta en una sola sentencia SQL parametrizada los productos del comercio autenticado, sus proveedores y la fecha del cálculo; agrupa por ID de proveedor y devuelve decimales como cadenas.

Estado: implementado y probado localmente; revisión cruzada pendiente. Ver [informe](../../../../docs/implementacion/etapa-5.md) y [RN-12 a RN-14](../../../../docs/segunda_entrega/02-reglas-de-negocio.md).
