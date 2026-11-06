// El token se guarda en sessionStorage: sobrevive a recargar la página, pero se borra
// al cerrar la pestaña. En una compu compartida del mostrador eso evita que la sesión
// quede abierta para la próxima persona. Cerrar sesión lo borra (RF-01).
const CLAVE = 'stock-manager.token';

export function leerToken() {
  try { return sessionStorage.getItem(CLAVE); } catch { return null; }
}

export function guardarToken(token) {
  try { sessionStorage.setItem(CLAVE, token); } catch { /* sin almacenamiento: la sesión dura hasta recargar */ }
}

export function borrarToken() {
  try { sessionStorage.removeItem(CLAVE); } catch { /* nada que borrar */ }
}
