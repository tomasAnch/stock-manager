const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TIEMPO_MAXIMO_MS = 8000;

// Error de la API con el estado HTTP y el código que devuelve el backend.
// status 0 significa que no hubo respuesta (servidor apagado, sin red o demora excesiva).
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Única función que habla con el backend. Agrega el token si hay sesión y
// convierte cualquier falla en un ApiError con un mensaje para mostrar.
export async function apiRequest(path, { method = 'GET', body, token, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const senales = [AbortSignal.timeout(TIEMPO_MAXIMO_MS)];
  if (signal) senales.push(signal);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method, headers, cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any(senales),
    });
  } catch (error) {
    if (signal?.aborted) throw error; // lo canceló la pantalla: no es un error para mostrar
    throw new ApiError('No pudimos conectar con el servidor. Probá de nuevo en unos segundos.', 0, 'NETWORK_ERROR');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(data?.error?.message || 'No se pudo completar la operación.', response.status, data?.error?.code);
  }
  return data;
}

export function checkHealth(signal) {
  return apiRequest('/api/health', { signal }).then(data => {
    if (data?.status !== 'ok' || data?.database !== 'connected') {
      throw new ApiError('El servicio todavía no está disponible.', 503, 'UNAVAILABLE');
    }
    return data;
  });
}

export function login(correo, contrasena, signal) {
  return apiRequest('/api/auth/login', { method: 'POST', body: { correo, contrasena }, signal });
}

export function obtenerSesion(token, signal) {
  return apiRequest('/api/auth/sesion', { token, signal });
}
