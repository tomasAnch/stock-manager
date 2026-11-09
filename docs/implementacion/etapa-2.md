# Etapa 2 — Acceso y permisos

05/11/2026 · Responsable: Nazareno, con Claude. Revisión: Tomás, con Codex. Estado: **revisada y aprobada; pendiente de integrar a `main`**. Las correcciones del 07/11 están en `5ce7c91` y Codex las verificó (comunicado por Tomás el 09/11). Parte de la etapa 1 cerrada (commit `41bf10a`); la revisión se hizo sobre `e6f0ce4` (rama `etapa-2-acceso`). Referencias: RF-01, RF-02, RN-01 y RN-15.

## Qué funciona

- **Login** con correo y contraseña. El correo se normaliza a minúsculas. Correo inexistente, contraseña incorrecta y cuenta inactiva responden igual: «Correo o contraseña incorrectos.» (CU-01). Una contraseña de más de 72 bytes se rechaza con 400 antes de consultar la base (ver [decisiones](#decisiones)).
- **Sesión**: el backend devuelve un token firmado que vence a las 8 h. El navegador lo guarda en `sessionStorage` y lo envía en cada solicitud protegida (`Authorization: Bearer …`). Al recargar la página se vuelve a validar con el servidor.
- **Cierre de sesión**: borra el token del navegador (RN-15: no hay revocación individual de tokens).
- **Cada solicitud protegida** verifica firma y vencimiento (un token sin vencimiento se rechaza), y consulta al usuario en la base: si no existe o está inactivo, responde 401 aunque el token no haya vencido. Rol y comercio salen de esa consulta, no del token ni del cuerpo de la solicitud.
- **Navegación por rol**: el dueño ve Catálogo, Inventario y Alertas y reposición; el empleado ve Catálogo, Inventario y Alertas. Las secciones muestran la etapa en que se implementan. Al cambiar de sección se revalida la sesión: si la API la rechaza, se vuelve al login con el motivo; si el servidor no responde, se muestra un aviso con «Reintentar» sin cerrar la sesión.
- **Controles reutilizables** para las etapas 3 a 5: `requireAuth`, `requireRole('DUENO')`, `delComercio` y `buscarDelComercio` (un ID de otro comercio responde 404, igual que uno inexistente).

| Ruta | Acceso | Respuesta |
|---|---|---|
| `POST /api/auth/login` | Pública | `{ token, usuario }` o 400/401 |
| `GET /api/auth/sesion` | Token vigente de usuario activo | `{ usuario }` o 401 |
| `GET /api/health` | Pública | Igual que en la etapa 1 |

`usuario` contiene `id`, `nombre`, `correo`, `rol` y `comercio { id, nombre }`. Nunca incluye el hash de la contraseña.

## Cómo probarlo a mano

1. Agregar a `backend/.env` un `JWT_SECRET` propio (el comando para generarlo está en `backend/.env.example`) y `JWT_EXPIRES_IN=8h`. Sin el secreto, la API no arranca y lo informa.
2. `npm ci` (hay una dependencia nueva: `jsonwebtoken`), `npm run generate` y `npm run dev`.
3. Abrir http://localhost:5173 e ingresar con `dueno.a@example.invalid` o `empleado.a@example.invalid` y la contraseña del seed de cada rol.
4. Para probar un usuario desactivado sin tocar el código, con la sesión abierta:

   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d stock_manager -c "UPDATE usuarios SET activo = false WHERE correo = 'empleado.a@example.invalid';"
   ```

   Al cambiar de sección, la app vuelve al login con «La sesión ya no es válida». Para dejarlo como estaba, repetir con `activo = true`.

## Decisiones

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| El token solo lleva el ID del usuario; rol, comercio y estado se leen de la base en cada solicitud | Lo pide RN-15: desactivar una cuenta o cambiar su rol tiene efecto inmediato y un token alterado no puede subir de rol | Confiar en rol y comercio guardados en el token: más rápido, pero un cambio en la base recién se notaría al vencer el token |
| Token en el encabezado `Authorization` y guardado en `sessionStorage` | Funciona igual con frontend y backend en dominios distintos (Vercel y Render) y se borra al cerrar la pestaña, útil en una compu compartida del mostrador | Cookie `httpOnly`: protege mejor ante código malicioso en la página, pero entre dominios distintos requiere `SameSite=None` y depende de que el navegador acepte cookies de terceros |
| Mismo mensaje para correo inexistente, contraseña incorrecta y cuenta inactiva, y tiempos de respuesta parecidos | No revela qué cuentas existen (CU-01). Si el correo no existe, igual se compara contra un hash ficticio. Es una mitigación: acerca los tiempos, pero no garantiza que sean idénticos | Mensajes distintos: más claros, pero permiten averiguar correos registrados |
| Contraseñas de hasta 72 bytes; más largas se rechazan con 400 antes de consultar la base | bcrypt solo compara los primeros 72 bytes: sin el límite, una contraseña correcta de 72 bytes seguida de cualquier texto también entraba. Se cuenta en bytes porque «ñ» o una tilde ocupan 2. El seed ya tenía el mismo límite, así que ninguna cuenta puede tener una contraseña más larga. Rechazarla antes no revela nada de la cuenta, porque no depende del correo | Mantener el límite anterior de 200 caracteres (era el error) o responder 401: también es válido, pero el 400 explica mejor por qué falla |
| Token sin vencimiento rechazado | La librería controla `exp` solo si el token lo trae; un token sin vencimiento serviría para siempre. Los que firma la aplicación siempre lo llevan | Confiar en que solo la aplicación firma tokens: es cierto mientras el secreto no se filtre, pero exigirlo cuesta una línea |
| Algoritmo fijo (HS256) y secreto obligatorio de al menos 32 caracteres | Un token firmado con otro algoritmo o sin firma se rechaza, y la app no arranca con un secreto débil o ausente | Aceptar cualquier algoritmo que indique el token |
| Vencimiento de 8 h, configurable con `JWT_EXPIRES_IN` | Cubre un turno de trabajo sin pedir login a cada rato | Tokens de renovación: agregan complejidad que el MVP no necesita |

## Pruebas

| Prueba | Qué comprueba | Resultado (Claude, 05/11) |
|---|---|---|
| `npm test` | 26 pruebas: las 14 de la etapa 1, 11 de acceso y 1 que exige la configuración de autenticación al crear la app. Login correcto e incorrecto, datos faltantes, contraseña de más de 72 bytes (texto común y con «ñ»), sin token, encabezado mal formado, otra firma, otro algoritmo, sin firma, sin vencimiento, vencido, usuario desactivado o eliminado, rol tomado de la base aunque el token diga otra cosa, 403 por rol, filtro por comercio, CORS con `Authorization` y validación de `JWT_SECRET` | 26/26 (07/11) |
| `npm run test:integration` | 7 pruebas con PostgreSQL real: las 5 de la etapa 1 y 2 nuevas. Login contra la base, desactivar la cuenta en la base y comprobar el rechazo inmediato, empleado con 403 en una ruta de dueño, categoría de otro comercio con 404 genérico | 7/7, dos ejecuciones seguidas (05/11 y 07/11) |
| Navegador (Chromium) | Login incorrecto y correcto, menú de cada rol, recarga, usuario desactivado, cierre de sesión, token vencido guardado, 390 px de ancho sin desborde, login solo con teclado | 11/11 pasos (05/11) |
| Navegador, aviso de conexión (07/11) | Servidor caído y error 500 al cambiar de sección muestran el aviso sin cerrar la sesión; «Reintentar» lo quita cuando el servidor vuelve; un cambio rápido de sección no muestra aviso falso; un 401 sigue llevando al login; 390 px sin desborde | 7/7 pasos |
| API en marcha (07/11) | Contraseña de 73 bytes y de 37 «ñ» → 400; token bien firmado sin vencimiento → 401 | Correcto |
| Pruebas con errores introducidos a propósito | Se quitó el control de usuario activo, se dejó que el cliente eligiera el comercio y se aceptó otro algoritmo (05/11); se volvió al límite de 200 caracteres, se contaron caracteres en lugar de bytes y se dejó de exigir el vencimiento (07/11). En cada caso falló la prueba correspondiente | Las pruebas detectan esos errores |

Estas ejecuciones las hizo Claude en una copia aislada (Linux, Node 24.22.1, PostgreSQL 18.4). Salidas: [05/11](resultados-etapa-2-claude-2026-11-05.txt) y [07/11, después de la revisión](resultados-etapa-2-claude-2026-11-07.txt). Nazareno repitió las del 05/11 en su equipo (Windows): 25/25 y 7/7, más el recorrido manual con ambos roles ([salida](resultados-etapa-2-naza-2026-11-05.txt)). Falta que repita las del 07/11.

## Revisión cruzada

Tomás revisó la rama `etapa-2-acceso` (`e6f0ce4`) con Codex el 06/11. Según su informe, leyó el código, las pruebas y la documentación de la etapa, ejecutó 25/25 y 7/7 con una base temporal propia, compiló, recorrió la app en el navegador y reprodujo los casos de las observaciones 1 y 2. Esos resultados son de Codex; Claude no los repitió, pero sí reprodujo cada problema antes de corregirlo.

Consideró correctos los controles centrales: RN-15 consulta usuario, estado, rol y comercio en cada solicitud; el login falla con un único mensaje; `requireRole` usa el rol de la base; `buscarDelComercio` limita al comercio y responde 404 genérico.

| Observación | Tipo | Resolución (07/11) | Verificación |
|---|---|---|---|
| El login aceptaba una contraseña correcta de 72 bytes seguida de cualquier texto, porque bcrypt ignora lo que pasa de 72 bytes | Bloqueante | Se rechaza con 400 cualquier contraseña de más de 72 bytes, antes de consultar la base | Prueba nueva con texto común y con «ñ»; falla si se vuelve al límite anterior o se cuentan caracteres; API real: 400 |
| `verificarToken` aceptaba un token bien firmado sin `exp` | Sugerencia, aceptada | Se exige `exp` | Caso nuevo en la prueba de sesión; falla si se quita el control; API real: 401 |
| El panel ignoraba en silencio los errores distintos de 401 al revalidar la sesión | Sugerencia, aceptada | Aviso con el mensaje y botón «Reintentar», sin cerrar la sesión. Un 401 sigue llevando al login y una solicitud cancelada por cambiar de sección no muestra aviso | 7 pasos en el navegador |
| La documentación prometía «el mismo tiempo de respuesta» | Sugerencia, aceptada | Se describe como mitigación en las decisiones y en el comentario del código | — |

Codex verificó las correcciones sobre la rama: según el informe de Tomás, confirmó las cuatro resoluciones, ejecutó 26/26 y 7/7 con una base temporal aislada y recorrió en el navegador el login, la falla de conexión, el error 500, «Reintentar», la vista móvil y la desactivación. Aprobó integrar la etapa a `main`. Sus salidas no se conservan en el repositorio. Sin verificar, según la revisión: despliegue real, las escrituras de las etapas siguientes y el uso con usuarios reales. La explicación para estudiar está en la [guía de la defensa](../../preparacion-defensa-oral.md#etapa-2--problema-estado-y-alcance).

## Límites y pendientes

- **Ensayo de despliegue**: pendiente; depende de elegir hosting y cuentas (checklist de la etapa 2).
- **Intentos de login**: no hay límite de intentos por IP. Conviene evaluarlo al desplegar, porque detrás del proxy de Render hace falta configurar `trust proxy` para identificar la IP real.
- **Revocación**: no se puede invalidar un token puntual antes de que venza; se bloquea desactivando al usuario (RN-15).
- El navegador muestra en consola los 401 esperados (por ejemplo, contraseña incorrecta) y un 404 por la falta del ícono de la pestaña. No son errores de la aplicación.

## Para la defensa

- **Identificar no es autorizar.** El login y `requireAuth` responden *quién sos*; `requireRole` y el filtro por comercio responden *qué podés hacer y sobre qué datos*.
- **Por qué un empleado no puede volverse dueño desde el navegador**: el rol no viaja en el token ni en el formulario. Aunque alguien edite el token, la firma deja de coincidir; y aunque mande `rol: 'DUENO'` o `comercioId` en el cuerpo, el backend usa lo que dice la base.
- **Ejemplo de RN-15**: un empleado deja el comercio con la sesión abierta. Se desactiva su cuenta y su siguiente solicitud recibe 401, aunque el token todavía no haya vencido.
- **Por qué 72 bytes**: bcrypt solo mira los primeros 72 bytes. Sin el límite, la app aceptaba una contraseña distinta de la registrada (la correcta más texto agregado). No era un agujero grave, porque igual había que conocer los primeros 72 bytes, pero el login no debe aceptar una contraseña que no es la guardada, y una contraseña más larga daría una falsa sensación de seguridad. Lo encontró la revisión cruzada y quedó cubierto con una prueba.
- **Recorrido**: pantalla de login → `POST /api/auth/login` → bcrypt compara la contraseña con el hash guardado → se firma el token → el navegador lo guarda y lo envía en cada solicitud → `requireAuth` lo verifica y consulta al usuario.
