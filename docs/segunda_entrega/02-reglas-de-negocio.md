# Reglas de negocio

Entrega 2 · Tomás Anchorena y Nazareno Romero · 24/09/2026

Estas reglas precisan el alcance presentado en la primera entrega. Son decisiones de diseño del equipo. Su aplicación se distribuye entre el backend y PostgreSQL según [el modelo de datos](03-modelo-de-datos.md).

## RN-01. Separación por comercio

Cada usuario pertenece a un comercio. El backend toma usuario, rol y comercio de la identidad autenticada y verificada en la base; no acepta esos datos como autoridad desde el cuerpo de una solicitud. Toda lectura o modificación por ID se limita al comercio correspondiente. Una referencia ajena se rechaza sin devolver datos del otro comercio.

Categorías y proveedores deben pertenecer al comercio del producto. En un movimiento, el producto y el usuario responsable deben pertenecer al mismo comercio. El historial se filtra por el comercio del producto, porque el movimiento no repite `comercio_id`. La aplicación no permite trasladar registros a otro comercio.

**Ejemplo:** un empleado del comercio A no puede registrar una salida sobre un producto del B, aunque conozca su ID.

## RN-02. Identificación de productos y usuarios

Los códigos se recortan en sus extremos, se convierten a mayúsculas y se rechazan si contienen espacios internos u otros caracteres de separación. Deben tener entre 1 y 50 caracteres. Son únicos por comercio, también para productos inactivos. Los nombres de producto no necesitan ser únicos.

El correo de acceso se recorta y convierte a minúsculas; es único globalmente. Las contraseñas se procesan tal como fueron ingresadas: no se recortan ni se les aplica la normalización de nombres o correos.

**Ejemplo:** ` har001 ` se guarda como `HAR001`; no puede crearse otro `HAR001` en el mismo comercio. Otro comercio sí puede usarlo.

## RN-03. Categorías, proveedores y nombres normalizados

Cada producto tiene una categoría y un proveedor principal del mismo comercio. No hay múltiples proveedores por producto en este MVP.

Para categorías y proveedores, el nombre visible se normaliza a Unicode NFC, se recorta y sus espacios intermedios repetidos se reducen a uno, conservando mayúsculas y tildes. `nombre_normalizado` se deriva del nombre visible convirtiéndolo a minúsculas. Ambos valores se calculan juntos en el backend y en el seed; el cliente no suministra el normalizado. Se exige entre 1 y 120 caracteres después de normalizar.

La combinación comercio y nombre normalizado es única en cada tabla, incluyendo registros inactivos. Las tildes y la ñ se conservan: no se utiliza `unaccent` ni se equiparan letras distintas. Se actualizan nombre y nombre normalizado en la misma escritura. La aplicación informa el conflicto si la base rechaza un duplicado.

**Ejemplo:** `  ALIMENTOS   Secos ` y `Alimentos Secos` son el mismo nombre. `Almacén` y `Almacen` son nombres distintos. Unicode NFC evita diferenciar dos representaciones equivalentes de la misma letra acentuada.

## RN-04. Unidad, precisión y cantidades

Cada producto usa `UNIDAD` o `KG`, sin conversiones. En `UNIDAD`, las cantidades deben representar números enteros; en `KG`, se admiten hasta tres decimales. Esto aplica al stock inicial, movimientos, mínimo, objetivo y cantidades editadas de reposición. Un valor como `2.000` representa dos unidades y es válido; `2.500` no.

Se emplean decimales exactos `NUMERIC(12,3)`, cuyo máximo positivo es `999999999.999`. El backend rechaza exceso de precisión o rango antes de guardar, sin redondear silenciosamente. El resultado de un ingreso también debe entrar en ese rango. Los movimientos tienen cantidad estrictamente positiva: el signo lo establece el tipo.

**Ejemplo:** se acepta un egreso de `0.250 KG`, pero se rechaza uno de `0.250 UNIDAD` y una cantidad de `0.0005 KG`.

## RN-05. Saldo y umbrales válidos

El stock actual y el mínimo son mayores o iguales a cero. El objetivo es mayor o igual al mínimo. El stock actual puede superar el objetivo: el objetivo orienta la reposición, no limita las existencias. Un egreso que supera el saldo se rechaza sin cambios.

**Ejemplo:** con stock 3, un egreso de 4 falla; un egreso de 3 deja cero. Mínimo 5 y objetivo 4 no es una configuración válida.

## RN-06. Movimiento y saldo en una transacción

Dentro de la transacción, primero se bloquea la fila del producto del comercio (`SELECT ... FOR UPDATE`) y se validan su unidad y actividad. Luego, tanto ingresos como egresos usan una actualización condicional sobre el ID del producto, el comercio autenticado y `activo = true`. El ingreso incrementa; el egreso decrementa y agrega la condición `stock_actual >= cantidad`. Se utiliza una operación aritmética en la base, no un saldo calculado desde una lectura anterior.

La actualización y la inserción del movimiento ocurren dentro de la misma transacción. Si la actualización no afecta exactamente un producto, o falla cualquier escritura, se revierte todo. En Prisma, la estrategia prevista es una transacción interactiva: el bloqueo con `$queryRaw` parametrizado, `updateMany` con `increment` o `decrement`, comprobación de `count` e inserción con el mismo cliente transaccional. El detalle está en [Operaciones transaccionales](03-modelo-de-datos.md#operaciones-transaccionales). También se validan el tipo, motivo, unidad y permisos antes de completar la operación.

**Ejemplo:** con saldo 3 y dos egresos simultáneos de 3, se confirma uno y se rechaza el otro. Si falla el registro del movimiento, tampoco queda descontado el saldo.

## RN-07. Alta y stock inicial

Solo el dueño crea productos. La creación parte de saldo cero. Si informa stock inicial positivo, se aplica un ingreso `STOCK_INICIAL`; si informa cero, no se genera un movimiento de cantidad cero. Producto e ingreso inicial se confirman en una única transacción.

El motivo `STOCK_INICIAL` solo se genera desde el alta: no está disponible en el formulario habitual de movimientos. Catálogo reutiliza la lógica de Inventario con la misma transacción.

**Ejemplo:** crear un producto con 10 unidades deja un producto con saldo 10 y un ingreso inicial de 10. Un error en ese ingreso revierte también el alta.

## RN-08. Historial y correcciones

El stock no se modifica desde la edición del producto. Los movimientos no se editan ni se eliminan desde la aplicación. Solo el dueño registra `AJUSTE`, de ingreso o egreso, con una observación no vacía que explique el motivo. El ajuste conserva el original y respeta todas las reglas de cantidad, saldo y actividad.

El historial incluye movimientos de productos inactivos. La fecha la asigna el sistema al registrar el movimiento; el usuario no la elige. No se incorporan anulaciones automáticas ni un circuito de aprobación de ajustes.

**Ejemplo:** se ingresaron 10 unidades, pero debían ser 8. El dueño registra un ajuste de egreso de 2 con observación sobre la carga equivocada. Si no hay saldo suficiente, se rechaza y debe revisar la diferencia física antes de corregir.

## RN-09. Baja, edición y reactivación de productos

La baja es lógica y puede hacerse aunque queden existencias; no pone el saldo a cero ni crea una salida. Un producto inactivo conserva saldo e historial, no admite movimientos y no participa en alertas ni reposición. Ambos roles pueden consultarlo junto con su historial; solo el dueño puede reactivarlo.

Para crear, editar o reactivar un producto, su categoría y proveedor deben estar activos y ser del comercio. Si están inactivos, se reasignan por referencias válidas en la misma operación antes de reactivar, o se reactivan esas referencias. La baja del producto sigue siendo posible sin cambiar sus referencias.

**Ejemplo:** si se desactivó un proveedor mientras su producto estaba inactivo, no se puede reactivar ese producto manteniendo el proveedor dado de baja.

## RN-10. Actividad de categorías y proveedores

Solo el dueño los administra. No se desactivan si tienen productos activos asociados. Pueden conservar productos inactivos y reactivarse después. No se ofrecen borrados físicos en el MVP. El control de referencias y actividad debe conservarse durante la operación, incluyendo solicitudes concurrentes de alta/reactivación y desactivación; la estrategia transaccional se describe en el modelo de datos.

**Ejemplo:** para desactivar “Distribuidora Sur”, primero se reasignan o desactivan todos sus productos activos.

## RN-11. Unidad estable

La unidad no se modifica si existe algún movimiento del producto, incluso si su saldo actual es cero. Si todavía no tiene movimientos, el dueño puede cambiarla respetando la precisión de sus umbrales.

**Ejemplo:** un producto con movimientos en kg no pasa a unidades al editarlo. Para comercializar otra presentación se crea otro producto.

## RN-12. Alertas calculadas

Se considera en alerta un producto activo con `stock_actual < stock_minimo`. Igualar el mínimo no produce alerta. Un mínimo cero desactiva las alertas de ese producto, aun cuando no quede stock. Se calcula al consultar o actualizar la pantalla; no hay avisos por correo, WhatsApp ni actualización por sockets.

**Ejemplo:** actual 4 y mínimo 5 genera alerta; actual 5 no. Actual 0 y mínimo 0 tampoco.

## RN-13. Sugerencia de reposición

Solo se incluyen productos activos en alerta. La cantidad sugerida es `stock_objetivo - stock_actual`, agrupada por proveedor principal. No es una previsión de ventas: surge del saldo y los umbrales configurados.

El dueño genera la lista; el proveedor es un destinatario externo, sin acceso al sistema. El envío se realiza fuera de la aplicación. La mercadería recibida se ingresa manualmente cuando llega.

**Ejemplo:** actual 3, mínimo 5 y objetivo 12 produce una sugerencia de 9. Con mínimo 5 y objetivo 5, se sugieren 2.

## RN-14. Lista temporal y copiable

El dueño puede editar las cantidades sugeridas, con valores positivos válidos para la unidad, u omitir productos. No puede agregar productos que no integren los faltantes del cálculo. Cada bloque copiado identifica proveedor, fecha del cálculo, código, nombre, cantidad solicitada y unidad.

La lista es una fotografía de la consulta: cambios posteriores del stock no reescriben automáticamente las cantidades ya editadas. Recargar o recalcular descarta las ediciones y obtiene los faltantes vigentes. Si no quedan productos, se muestra un estado vacío y no se produce una lista de pedido. Copiar no guarda órdenes ni altera saldos. Si el navegador no permite copiar automáticamente, se ofrece el mismo texto seleccionable para copia manual.

**Ejemplo:** el dueño cambia una sugerencia de 9 a 12 para comprar un paquete completo. Puede copiarla para enviarla; al recargar vuelve a calcularse la sugerencia según el stock.

## RN-15. Acceso, responsables y usuarios inactivos

El acceso requiere credenciales válidas. Se prevé un token JWT firmado, con vencimiento e identificación del usuario. En cada solicitud protegida se verifica el token y se consulta el usuario: debe existir y estar activo. De esa consulta se obtienen el rol y el comercio autorizados; no se confía únicamente en los datos guardados en el token.

Desactivar un usuario mediante un script administrativo bloquea las siguientes solicitudes protegidas, aunque el token no haya vencido. El historial se conserva. Las solicitudes que ya fueron autorizadas y están en curso no se cancelan retrospectivamente. Cerrar sesión elimina la credencial del cliente; no se ofrece revocación individual de tokens ni gestión de sesiones en esta versión.

**Ejemplo:** un exempleado conserva un token válido, pero su siguiente intento de cargar un movimiento se rechaza porque su cuenta fue desactivada.

## Combinaciones de tipo y motivo

| Motivo | Tipo | Responsable | Observación |
|---|---|---|---|
| `STOCK_INICIAL` | `INGRESO` | Dueño, generado por el alta | Opcional |
| `REPOSICION` | `INGRESO` | Dueño o empleado | Opcional |
| `SALIDA` | `EGRESO` | Dueño o empleado | Opcional; puede indicar venta simple, vencimiento o rotura |
| `AJUSTE` | `INGRESO` o `EGRESO` | Solo dueño | Obligatoria y no vacía |

Las salidas no crean comprobantes ni totales de venta. Un empleado no puede enviar `AJUSTE` o `STOCK_INICIAL` para eludir los permisos, aunque modifique manualmente una solicitud.
