# Etapa 5 — Alertas y reposición

## Estado y responsables

Implementada el 10/11/2026 en `etapa-5-reposicion`, partiendo del `main` actualizado que Tomás informó (`cc4d42d`). Tomás coordina; Codex escribió código, pruebas y documentación y ejecutó las comprobaciones locales. Nazareno con Claude harán la revisión cruzada. **Todavía no está aprobada por esa revisión ni integrada a main.** Git lo ejecuta Tomás; el commit a revisar se identifica cuando lo comparta.

## Qué quedó funcionando

- RF-10 / RN-12: ambos roles consultan productos activos cuyo saldo es estrictamente menor al mínimo. Igualdad y mínimo cero no producen alerta.
- RF-11 / RN-13: el dueño genera una lista por proveedor, con objetivo menos saldo actual. El empleado recibe 403 si llama directamente a la ruta de generación.
- RF-12 / RN-14: el dueño edita cantidades positivas, omite o vuelve a incluir productos del cálculo y copia texto o descarga CSV por proveedor. No puede agregar productos externos a ese cálculo.
- Los productos por unidad exigen enteros; kg admite hasta tres decimales. La pantalla acepta punto o coma; no convierte silenciosamente entradas inválidas ni las redondea.
- Copiar/exportar usa la misma selección editada y la fecha original. No guarda órdenes ni altera inventario. Recargar, salir de la sección o recalcular descarta ediciones. Actualizar solo alertas conserva la lista.
- Si falla la copia automática se ofrece el texto seleccionable. Si falla la preparación de la descarga se conserva la lista y se avisa. Si falla una consulta se muestra error y Reintentar, sin inventar un resultado vacío.

## Archivos y API

| Archivo | Responsabilidad |
|---|---|
| `backend/src/modules/reposicion/reposicion.routes.js` | Autenticar, autorizar y responder consultas. |
| `backend/src/modules/reposicion/reposicion.service.js` | Consultar faltantes y construir la lista por proveedor. |
| `backend/src/app.js` | Incorporar el router. |
| `frontend/src/features/reposicion/Reposicion.jsx` | Alertas, lista temporal, ediciones, errores y acciones de salida. |
| `frontend/src/features/reposicion/salidas.js` | Validación y generación del texto/CSV, sin depender del navegador. |
| `frontend/src/features/acceso/Panel.jsx` | Abrir la sección disponible para el rol. |
| `backend/tests/unit/reposicion.test.js` | Casos de cantidades y formato de salidas. |
| `backend/tests/integration/database.test.js` | Casos de API con PostgreSQL real, sumados a la batería existente. |
| `backend/tests/reposicion-browser.mjs` | Recorrido repetible en navegador con base exclusiva. |

`GET /api/reposicion/alertas` devuelve `{ items }` para dueño y empleado. Cada ítem contiene ID, código, nombre, unidad, saldo, mínimo y proveedor. No devuelve una cantidad sugerida.

`GET /api/reposicion/lista` devuelve `{ calculadaEn, grupos }` solo para el dueño. Cada grupo tiene proveedor e ítems con la cantidad sugerida. Ambas rutas son de lectura: usan GET porque no crean registros. No hay endpoints de envío de pedidos, guardado de listas ni exportación; esas salidas se construyen en el navegador a partir de la consulta autorizada.

## Decisiones

**Una consulta, una fotografía.** El servicio usa `$queryRaw` de Prisma con interpolación parametrizada. La consulta compara columnas (`stock_actual < stock_minimo`), calcula la diferencia, une el proveedor y obtiene `statement_timestamp()` en una misma sentencia. PostgreSQL lee un estado consistente para esa sentencia; no hace falta bloquear productos porque no se escribe stock. El comercio proviene de `req.auth`, nunca del query string. No se concatenan valores dentro del SQL. Para una lista vacía se devuelve la hora del servidor de la aplicación, sin filas que exportar.

**Agrupar por ID.** El nombre es para mostrar; el ID identifica al proveedor. Así la agrupación no depende de cómo se escriba el nombre. Se devuelve el conjunto completo de faltantes del comercio, sin paginación, para no exportar por accidente solo una página. Es una decisión para el volumen del MVP; no se realizó una prueba de carga masiva.

**Lista temporal.** React conserva la respuesta y sus ediciones en memoria. Generar otro cálculo reemplaza esa respuesta; actualizar alertas no la reemplaza. Se muestran fecha y aviso de descarte. No se necesita una tabla o migración nueva. Un CSV puede conservarse fuera de la aplicación, pero no constituye una orden persistida ni un ingreso de mercadería.

**Cantidades exactas.** PostgreSQL calcula la sugerencia en decimal, Prisma la serializa como cadena. En el navegador se validan milésimas con BigInt, evitando aritmética de punto flotante y redondeos. Se admiten hasta nueve cifras enteras y tres decimales. La validación vuelve a ejecutarse al construir cada salida, además del bloqueo visual de botones.

**CSV de RN-14.** UTF-8 con BOM, `;`, CRLF, coma decimal, enteros para UNIDAD y tres decimales para KG. Columnas: `proveedor;fecha_calculo;codigo;nombre;cantidad;unidad`. La fecha corresponde al cálculo con desplazamiento -03:00, no a la descarga ni al huso del equipo. Se duplican comillas y se encierran campos que contienen comillas, punto y coma o saltos. Texto que comienza con `=`, `+`, `-` o `@`, incluso después de espacios, recibe apóstrofo solo en el CSV. Se respeta la advertencia de RN-14: otro programa/configuración puede necesitar importar indicando separador y código como texto para conservar ceros iniciales.

**Errores y permisos.** Las rutas reutilizan la lectura de usuario activo, rol y comercio en cada solicitud. Ocultar botones no reemplaza el permiso del backend. Las consultas viejas se cancelan al salir o iniciar otra; las acciones se deshabilitan durante la carga. Una lista ya descargada o copiada no puede revocarse: es información que el dueño ya obtuvo cuando tenía acceso.

## Comprobaciones ejecutadas por Codex

Windows, Node 24.22.1, PostgreSQL 18.6, Edge sin ventana. Base temporal exclusiva `stock_manager_test`, puerto local 55435, distinta de desarrollo. Se inicializó vacía y el runner aplicó la migración existente con sus siete CHECK. No se modificó `.env`, el esquema ni las migraciones. Las pruebas retiraron sus propios datos al finalizar; el servidor temporal se detuvo después de las comprobaciones.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `npm test` | 40/40 | [Salida](resultados-etapa-5-unitarias.txt) |
| `npm run test:integration` | 24/24 | [Salida](resultados-etapa-5-integracion.txt) |
| `npm run build` | Correcto | [Salida](resultados-etapa-5-build.txt) |
| Recorrido de reposición en Edge | 10 pasos completos, ambos roles, escritorio y móvil | [Salida](resultados-etapa-5-navegador.txt) |
| Regresión del recorrido de Inventario en Edge | 15 pasos correctos de la etapa 4 | [Salida](resultados-etapa-5-regresion-inventario.txt) |

Las pruebas de integración incluyen mínimo cero, igualdad, baja, otro comercio, permiso de generación, cambio de rol/estado con token vigente, lista vacía, diferencias decimales exactas, agrupación y ausencia de escrituras. La consulta posterior a un ingreso usa el saldo nuevo.

El navegador verifica cantidades inválidas, ediciones, omisiones, descargas reales y sus bytes, copia con respuesta controlada, copia manual ante rechazo, fallo de descarga, conservación y recálculo de la fotografía, recarga, errores/reintentos, empleado y vacíos. Compara productos y movimientos antes/después de las salidas. Capturas: [escritorio](etapa-5-escritorio.png) y [móvil](etapa-5-movil.png).

Durante el desarrollo, la ejecución restringida no pudo conectar a localhost (`EACCES`); se repitió con conexiones locales habilitadas. El primer recorrido encontró una etiqueta ambigua en el texto de copia manual: se corrigió asociando explícitamente etiqueta y textarea. La salida guardada corresponde a la ejecución final correcta.

**Límites de la evidencia:** el portapapeles usa respuestas controladas de éxito/rechazo para no sobrescribir el portapapeles personal. No se abrió el CSV en Excel, no se comprobó el diálogo nativo de guardado ni una descarga cancelada por el usuario. El navegador solicita la descarga y no afirma que el usuario la haya conservado. No hubo prueba online ni piloto; corresponden a etapas 6 y 7. Las pruebas de Tomás/Nazareno personalmente y la revisión de Claude están pendientes.

## Cómo repetir el recorrido de navegador

Ejecutar desde la raíz, después de instalar dependencias y generar Prisma. Requiere `TEST_DATABASE_URL` apuntando a una base exclusiva llamada `stock_manager_test`, distinta de `DATABASE_URL`, con migración aplicada y seis tablas de negocio vacías. El script se niega a borrar datos preexistentes. `npm run test:integration` deja esa base migrada y limpia si termina correctamente.

```powershell
node --import tsx backend/tests/reposicion-browser.mjs
```

Como en la etapa 4, Playwright se obtiene de una instalación externa: `PLAYWRIGHT_MODULE` puede apuntar a su paquete. Por omisión usa Edge; `BROWSER_CHANNEL=chromium` usa el navegador de Playwright si está instalado. `CAPTURAS=1` guarda las dos capturas en esta carpeta. El script levanta una API en puerto libre y Vite en 55438; cierra ambos y elimina solo sus fixtures al terminar. Las contraseñas que aparecen en el script son exclusivas de esos usuarios temporales de prueba.

## Recorrido manual para el equipo

1. Entrar como dueño. Crear un proveedor/categoría y dos productos: Yerba (UNIDAD, actual 3, mínimo 5, objetivo 12) y Harina (KG, actual 0.100, mínimo 0.200, objetivo 0.350). El saldo inicial se ingresa mediante el alta.
2. Abrir Alertas y reposición. Generar la lista: deben sugerirse 9 unidades y 0.250 kg.
3. Cambiar Yerba a 12, omitir Harina y copiar/descargar. Ambas salidas deben incluir solo Yerba con 12 y la misma fecha del cálculo.
4. Volver a incluir Harina. Probar una cantidad vacía o con cuatro decimales: las salidas de ese proveedor quedan bloqueadas hasta corregir u omitir el ítem.
5. Mientras se conserva la lista, registrar desde otra sesión un ingreso que lleve un producto al mínimo. Actualizar alertas lo retira de alertas, pero no cambia las cantidades editadas. Recalcular sí reconstruye la lista y descarta ediciones.
6. Omitir todos los ítems de un proveedor: no debe permitir copiar ni exportar ese grupo. Probar un comercio sin faltantes.
7. Entrar como empleado: debe ver alertas, sin generación ni salidas. Probar escritorio y celular. Confirmar en Inventario que copiar y exportar no agregó movimientos.

## Para que revise Claude

Revisar la rama y commit compartidos contra main, sin corregir directamente. Priorizar RN-12 a RN-14, autorización y aislamiento, fechas y decimales, igualdad entre copia/CSV, omisiones, fallos de red/portapapeles/descarga y conservación de la fotografía. Repetir pruebas de lógica, integración y recorrido de navegador. Separar lo leído, lo ejecutado y lo no verificado; clasificar observaciones como bloqueantes o sugerencias y dar pasos de reproducción. Revisar también la explicación de la etapa 5 en la guía de defensa. El cierre y la integración se registrarán después de resolver esa revisión.
