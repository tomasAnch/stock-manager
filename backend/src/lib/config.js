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
