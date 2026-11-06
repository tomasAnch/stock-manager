# Etapa 2 — Acceso y permisos

05/11/2026 · Responsable: Nazareno, con Claude. Revisión: Tomás, con Codex. Estado: **implementada, pendiente de revisión**. Parte de la etapa 1 cerrada (commit `41bf10a`). Referencias: RF-01, RF-02, RN-01 y RN-15.

## Qué funciona

- **Login** con correo y contraseña. El correo se normaliza a minúsculas. Correo inexistente, contraseña incorrecta y cuenta inactiva responden igual: «Correo o contraseña incorrectos.» (CU-01).
- **Sesión**: el backend devuelve un token firmado que vence a las 8 h. El navegador lo guarda en `sessionStorage` y lo envía en cada solicitud protegida (`Authorization: Bearer …`). Al recargar la página se vuelve a validar con el servidor.
- **Cierre de sesión**: borra el token del navegador (RN-15: no hay revocación individual de tokens).
- **Cada solicitud protegida** verifica firma y vencimiento, y consulta al usuario en la base: si no existe o está inactivo, responde 401 aunque el token no haya vencido. Rol y comercio salen de esa consulta, no del token ni del cuerpo de la solicitud.
- **Navegación por rol**: el dueño ve Catálogo, Inventario y Alertas y reposición; el empleado ve Catálogo, Inventario y Alertas. Las secciones muestran la etapa en que se implementan. Al cambiar de sección se revalida la sesión: si la API la rechaza, se vuelve al login con el motivo.
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
| Mismo mensaje y mismo tiempo de respuesta para correo inexistente, contraseña incorrecta y cuenta inactiva | No revela qué cuentas existen (CU-01). Si el correo no existe, igual se compara contra un hash ficticio | Mensajes distintos: más claros, pero permiten averiguar correos registrados |
| Algoritmo fijo (HS256) y secreto obligatorio de al menos 32 caracteres | Un token firmado con otro algoritmo o sin firma se rechaza, y la app no arranca con un secreto débil o ausente | Aceptar cualquier algoritmo que indique el token |
| Vencimiento de 8 h, configurable con `JWT_EXPIRES_IN` | Cubre un turno de trabajo sin pedir login a cada rato | Tokens de renovación: agregan complejidad que el MVP no necesita |

## Pruebas

| Prueba | Qué comprueba | Resultado (Claude, 05/11) |
|---|---|---|
| `npm test` | 25 pruebas: las 14 de la etapa 1, 10 nuevas de acceso y 1 que exige la configuración de autenticación al crear la app. Login correcto e incorrecto, datos faltantes, sin token, encabezado mal formado, otra firma, otro algoritmo, sin firma, vencido, usuario desactivado o eliminado, rol tomado de la base aunque el token diga otra cosa, 403 por rol, filtro por comercio, CORS con `Authorization` y validación de `JWT_SECRET` | 25/25 |
| `npm run test:integration` | 7 pruebas con PostgreSQL real: las 5 de la etapa 1 y 2 nuevas. Login contra la base, desactivar la cuenta en la base y comprobar el rechazo inmediato, empleado con 403 en una ruta de dueño, categoría de otro comercio con 404 genérico | 7/7, dos ejecuciones seguidas |
| Navegador (Chromium) | Login incorrecto y correcto, menú de cada rol, recarga, usuario desactivado, cierre de sesión, token vencido guardado, 390 px de ancho sin desborde, login solo con teclado | 11/11 pasos |
| Pruebas con errores introducidos a propósito | Se quitó el control de usuario activo, se dejó que el cliente eligiera el comercio y se aceptó otro algoritmo: en cada caso falló la prueba correspondiente | Las pruebas detectan esos errores |

Estas ejecuciones las hizo Claude en una copia aislada (Linux, Node 24.22.1, PostgreSQL 18.4). La salida está en [resultados-etapa-2-claude-2026-11-05.txt](resultados-etapa-2-claude-2026-11-05.txt). Nazareno las repitió en su equipo (Windows) el mismo día: 25/25 y 7/7, más el recorrido manual con ambos roles ([salida](resultados-etapa-2-naza-2026-11-05.txt)). Falta que Tomás y Codex revisen esta versión.

## Límites y pendientes

- **Ensayo de despliegue**: pendiente; depende de elegir hosting y cuentas (checklist de la etapa 2).
- **Intentos de login**: no hay límite de intentos por IP. Conviene evaluarlo al desplegar, porque detrás del proxy de Render hace falta configurar `trust proxy` para identificar la IP real.
- **Revocación**: no se puede invalidar un token puntual antes de que venza; se bloquea desactivando al usuario (RN-15).
- El navegador muestra en consola los 401 esperados (por ejemplo, contraseña incorrecta) y un 404 por la falta del ícono de la pestaña. No son errores de la aplicación.

## Para la defensa

- **Identificar no es autorizar.** El login y `requireAuth` responden *quién sos*; `requireRole` y el filtro por comercio responden *qué podés hacer y sobre qué datos*.
- **Por qué un empleado no puede volverse dueño desde el navegador**: el rol no viaja en el token ni en el formulario. Aunque alguien edite el token, la firma deja de coincidir; y aunque mande `rol: 'DUENO'` o `comercioId` en el cuerpo, el backend usa lo que dice la base.
- **Ejemplo de RN-15**: un empleado deja el comercio con la sesión abierta. Se desactiva su cuenta y su siguiente solicitud recibe 401, aunque el token todavía no haya vencido.
- **Recorrido**: pantalla de login → `POST /api/auth/login` → bcrypt compara la contraseña con el hash guardado → se firma el token → el navegador lo guarda y lo envía en cada solicitud → `requireAuth` lo verifica y consulta al usuario.
