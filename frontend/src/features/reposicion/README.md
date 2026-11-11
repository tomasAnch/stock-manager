# Alertas y reposición

`Reposicion.jsx` muestra faltantes para ambos roles. El dueño puede generar la lista por proveedor, editar cantidades, omitir productos y copiar texto o descargar un CSV. Las entradas aceptan punto o coma decimal y no redondean valores inválidos. Un grupo vacío o con cantidades inválidas tiene sus salidas deshabilitadas.

`salidas.js` valida cantidades con milésimas enteras (BigInt) y genera texto/CSV desde los mismos ítems editados. La lista no se guarda en la base; al recargar, salir de la sección o recalcular se pierden las ediciones. Actualizar alertas no cambia la lista ya generada. El CSV conserva la fecha del cálculo y respeta RN-14: UTF-8 con BOM, `;`, coma decimal, CRLF, escape de campos y neutralización de posibles fórmulas.

Si el portapapeles falla se ofrece texto seleccionable. Si la preparación de la descarga falla se conserva la lista. Las solicitudes canceladas al salir no vuelcan respuestas viejas sobre otra pantalla. Al cambiar de usuario o rol, Panel monta nuevamente la sección para descartar su estado anterior.

Estado: implementado y probado localmente; revisión cruzada pendiente. Ver [informe](../../../../docs/implementacion/etapa-5.md), [requerimientos](../../../../docs/segunda_entrega/01-requerimientos.md) y [RN-12 a RN-14](../../../../docs/segunda_entrega/02-reglas-de-negocio.md).
