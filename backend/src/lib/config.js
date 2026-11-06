import './load-env.js';

export function databaseUrl(value = process.env.DATABASE_URL) {
  if (!value) throw new Error('Falta DATABASE_URL. Revisar backend/.env.');
  let url;
  try { url = new URL(value); } catch { throw new Error('DATABASE_URL no tiene un formato válido.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.pathname.length < 2) {
    throw new Error('DATABASE_URL debe apuntar a una base PostgreSQL.');
  }
  return value;
}

// Configuración del token de sesión. El secreto firma los tokens: quien lo conozca
// podría fabricar sesiones válidas, por eso es obligatorio, largo y nunca se imprime.
export function authConfig(env = process.env) {
  const secret = env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres. Revisar backend/.env.');
  }
  const expiresIn = env.JWT_EXPIRES_IN || '8h';
  if (!/^[1-9]\d{0,2}[mh]$/.test(expiresIn)) {
    throw new Error('JWT_EXPIRES_IN debe indicar minutos u horas, por ejemplo 8h o 30m.');
  }
  return { secret, expiresIn };
}

export function serverConfig(env = process.env) {
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválido.');
  const origin = env.FRONTEND_ORIGIN || 'http://localhost:5173';
  let url;
  try { url = new URL(origin); } catch { throw new Error('FRONTEND_ORIGIN inválido.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
    throw new Error('FRONTEND_ORIGIN debe ser un origen HTTP(S) sin ruta ni barra final.');
  }
  return { port, host: env.HOST || '127.0.0.1', origin };
}
