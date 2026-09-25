# Requerimientos y casos de uso

Entrega 2 · Tomás Anchorena y Nazareno Romero · 24/09/2026

## Objetivo y contexto

El sistema permitirá a pequeños comercios minoristas registrar su inventario y preparar la reposición a partir de existencias y umbrales configurados. Se busca reducir la dependencia del conteo visual y de anotaciones dispersas, conservando un historial de las operaciones.

La propuesta de la primera entrega fue aprobada. Esta entrega documenta el diseño previo a la implementación: requerimientos, reglas de negocio, esquema de base de datos y módulos, sujetos a la aprobación de la tutora y del comité de trabajo final.

El MVP se probará con uno o dos comercios piloto. Cada cuenta pertenece a un comercio y solo accede a sus datos. No hay registro público de comercios ni planes comerciales.

## Actores

| Actor | Responsabilidad |
|---|---|
| Dueño / administrador | Administra productos, categorías, proveedores y umbrales; registra movimientos, corrige diferencias y genera la reposición. En código se representa con el rol `DUENO`. |
| Empleado de mostrador | Consulta productos, alertas e historial; registra ingresos por reposición y salidas habituales. Se representa con `EMPLEADO`. |
| Proveedor | Recibe fuera del sistema una lista copiada por el dueño. Es un destinatario externo: no tiene usuario, portal ni operaciones en la aplicación. |

El equipo técnico carga comercios y usuarios mediante un script inicial y puede desactivar cuentas por script. Esa tarea de instalación no introduce un tercer rol funcional ni un módulo de administración de cuentas.

## Alcance

Se incluyen acceso autenticado, catálogo, movimientos, alertas y listas temporales de reposición copiables. Las unidades iniciales son `UNIDAD` y `KG`. Cada producto tiene una categoría y un proveedor principal.

Quedan fuera: facturación electrónica y POS fiscal, comprobantes y totales de ventas, pasarelas de pago, aplicación móvil nativa, múltiples depósitos, conversiones de unidades, varios proveedores por producto, precios de venta, órdenes persistidas con estados, integración con WhatsApp, exportación CSV, registro público, pantallas de administración de usuarios, recuperación de contraseña y cambio de rol desde la aplicación. Podrán evaluarse después del TFI, sin formar parte del compromiso actual.

## Requerimientos funcionales

| ID | Requerimiento | Criterio de aceptación | Reglas |
|---|---|---|---|
| RF-01 | Iniciar y cerrar sesión. | Solo se accede con credenciales válidas de una cuenta activa; cerrar sesión elimina la credencial del cliente. | RN-15 |
| RF-02 | Restringir operaciones por rol y comercio. | Se rechazan solicitudes de otro comercio o sin permiso, aun si se envían fuera de la interfaz. Cada solicitud protegida verifica al usuario en la base. | RN-01, RN-15 |
| RF-03 | Administrar categorías y proveedores. | El dueño puede crear, editar, consultar, desactivar y reactivar registros; se impiden nombres duplicados por comercio y bajas con productos activos asociados. | RN-03, RN-10 |
| RF-04 | Dar de alta productos con stock inicial opcional. | Se exige código, nombre, unidad, categoría, proveedor y umbrales válidos. El saldo y el ingreso inicial quedan registrados juntos, o no se crea ninguno. | RN-02 a RN-07 |
| RF-05 | Consultar y editar el catálogo. | Ambos roles buscan productos por código o nombre y consultan existencias, unidad y umbrales. Solo el dueño edita sus datos; no puede sobrescribir el saldo. | RN-01 a RN-05, RN-08, RN-11 |
| RF-06 | Dar de baja y reactivar productos. | Solo el dueño cambia su actividad. Una baja conserva saldo e historial; una reactivación exige referencias activas. | RN-09, RN-10 |
| RF-07 | Registrar reposiciones y salidas habituales. | Ambos roles pueden operar sobre productos activos de su comercio. Se rechazan cantidades inválidas, motivos incompatibles y saldos insuficientes. | RN-01, RN-04 a RN-06 |
| RF-08 | Registrar ajustes de inventario. | Solo el dueño crea ajustes con explicación; no puede modificar ni borrar movimientos anteriores. | RN-04 a RN-06, RN-08 |
| RF-09 | Consultar el historial por producto. | Se muestran fecha, responsable, tipo, motivo, cantidad, unidad y observación; se incluyen productos inactivos y se ordena por fecha, con paginación. | RN-01, RN-08 |
| RF-10 | Consultar alertas de stock. | Ambos roles ven los productos activos por debajo del mínimo. Igualar el mínimo y configurar mínimo cero tienen el comportamiento definido, sin alertas persistidas. | RN-12 |
| RF-11 | Generar y ajustar una lista de reposición. | El dueño obtiene faltantes agrupados por proveedor y cantidades objetivo menos actual. Puede modificar cantidades u omitir ítems, sin agregar productos ajenos al cálculo. | RN-13, RN-14 |
| RF-12 | Copiar la lista de un proveedor. | Se obtiene texto con proveedor, fecha del cálculo, código, nombre, cantidad y unidad. Si falla el portapapeles se permite copia manual. No se guarda una orden ni cambia el stock. | RN-14 |

## Requerimientos no funcionales

| ID | Requerimiento | Forma prevista de verificarlo |
|---|---|---|
| RNF-01 | Consistencia del inventario. | Probar egresos simultáneos y fallos entre actualización e inserción. El saldo nunca será negativo y deberá coincidir con ingresos menos egresos, incluidos los ajustes. |
| RNF-02 | Protección de acceso y credenciales. | Verificar permisos del backend, aislamiento por comercio, usuario desactivado y token vencido. Guardar contraseñas como hash, no registrar secretos y usar HTTPS en el despliegue. |
| RNF-03 | Carga ágil de movimientos. | Objetivo de la propuesta: completar una carga habitual en menos de 10 segundos, desde el formulario abierto hasta su confirmación, con sesión iniciada y producto existente. Cronometrar casos en el piloto y registrar las condiciones y resultados reales. |
| RNF-04 | Reposición accesible y aplicación web responsive. | Obtener el conjunto de faltantes con una acción, sin calcular cada ítem a mano; la copia posterior se realiza por proveedor. Verificar formularios y tablas en escritorio y pantalla móvil, con etiquetas claras, navegación por teclado y errores comprensibles. |
| RNF-05 | Precisión de cantidades. | Usar decimales exactos y rechazar valores con precisión o rango no admitidos. Probar unidades enteras y fracciones de kg sin redondeo silencioso. |
| RNF-06 | Código y documentación mantenibles. | Separar interfaz, validaciones, lógica y persistencia; mantener nombres coherentes y reglas documentadas. Conservar código, esquema, migraciones e informes en el repositorio único. |
| RNF-07 | Instalación reproducible. | Documentar las versiones elegidas, variables de entorno, migraciones y seed al implementar. Guardar un archivo de dependencias bloqueadas; excluir contraseñas y archivos de entorno reales. |
| RNF-08 | Funcionamiento online. | Mínimo exigido por el campus: al menos un componente principal alojado y funcionando online para la entrega final. Despliegue previsto por el equipo: Render/Vercel y una base PostgreSQL administrada, como en la primera entrega; la elección definitiva se confirmará al desplegar. |

Los indicadores anteriores son criterios a verificar, no resultados medidos en esta entrega. La actualización del inventario se confirma al guardar una operación; otras pantallas muestran el nuevo saldo al volver a consultar. El MVP no promete sincronización instantánea entre navegadores ni funcionamiento sin conexión.

## Casos de uso

Precondición común, salvo CU-01: sesión válida, cuenta activa y acceso al comercio propio. Los permisos se comprueban también en el backend.

| ID | Caso / actor | Flujo principal y resultado | Alternativas | RF |
|---|---|---|---|---|
| CU-01 | Acceder / ambos roles | Introduce correo y contraseña; el sistema valida y habilita sus operaciones. Puede cerrar sesión. | Credenciales inválidas o cuenta inactiva: se rechaza el acceso sin exponer detalles de otras cuentas. | RF-01, RF-02 |
| CU-02 | Administrar referencias / dueño | Crea o modifica categorías y proveedores; puede desactivarlos o reactivarlos. | Duplicado, referencia ajena o productos activos asociados: se rechaza. | RF-03 |
| CU-03 | Crear producto / dueño | Carga datos y stock inicial; el sistema registra producto y, si corresponde, ingreso inicial. | Datos inválidos o fallo al registrar el ingreso: revierte todo. | RF-04 |
| CU-04 | Consultar y mantener catálogo / ambos consultan, dueño modifica | Busca un producto y consulta stock; el dueño edita datos, lo desactiva o reactiva. | Cambio de unidad con historial o referencias inactivas al editar/reactivar: se rechaza. | RF-05, RF-06 |
| CU-05 | Registrar movimiento / ambos roles | Selecciona producto activo, tipo/motivo y cantidad; confirma; se actualizan saldo e historial juntos. | Falta de saldo, cantidad inválida, producto inactivo o fallo de escritura: no se confirma la operación. | RF-07 |
| CU-06 | Corregir inventario / dueño | Consulta la diferencia y registra un ajuste con observación; conserva el historial. | Empleado, observación vacía o egreso excesivo: se rechaza. | RF-08 |
| CU-07 | Revisar historial y alertas / ambos roles | Consulta movimientos por producto o el panel de productos bajo mínimo. | Sin registros o sin alertas: se muestra un estado vacío. | RF-09, RF-10 |
| CU-08 | Preparar reposición / dueño | Genera faltantes agrupados, ajusta u omite ítems y copia un bloque por proveedor. | Lista vacía, cantidad inválida o portapapeles no disponible: informa el estado o permite copia manual. | RF-11, RF-12 |

La secuencia de CU-05 está en [Módulos y estructura](04-modulos.md#secuencia-de-registrar-un-movimiento). La consulta del historial de CU-07 permite revisar también productos inactivos, aunque no aparezcan entre las opciones de carga de movimientos.

## Matriz de permisos

| Acción | Dueño | Empleado |
|---|:---:|:---:|
| Consultar catálogo, existencias, alertas e historial | Sí | Sí |
| Consultar productos inactivos y su historial | Sí | Sí |
| Registrar `REPOSICION` y `SALIDA` | Sí | Sí |
| Crear productos y su `STOCK_INICIAL` | Sí | No |
| Editar productos y configurar mínimos/objetivos | Sí | No |
| Desactivar o reactivar productos | Sí | No |
| Administrar categorías y proveedores | Sí | No |
| Registrar `AJUSTE` | Sí | No |
| Generar, editar temporalmente y copiar reposición | Sí | No |
| Borrar o editar movimientos existentes | No | No |
| Operar sobre otro comercio | No | No |
| Administrar usuarios desde pantallas | No disponible | No disponible |

## Validación prevista con el piloto

Se mantiene lo previsto en la primera entrega: probar el sistema con movimientos reales de un comercio piloto durante al menos una semana. Se registrarán tiempos de carga, utilidad de las alertas y dificultades observadas, y se revisará con el comercio si las alertas hubieran anticipado faltantes. La planificación concreta del piloto se coordinará durante la implementación.
