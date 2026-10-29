import { databaseUrl } from '../src/lib/config.js';

function databaseIdentity(url) {
  const hostname = url.hostname.toLowerCase();
  const host = hostname === 'localhost' ? '127.0.0.1' : hostname;
  const port = url.port || '5432';
  const name = decodeURIComponent(url.pathname);
  return `${host}:${port}${name}`;
}

export function requireTestDatabase(env = process.env) {
  const value = env.TEST_DATABASE_URL;
  if (!value) throw new Error('Falta TEST_DATABASE_URL; no se usa DATABASE_URL como reemplazo.');
  const target = new URL(databaseUrl(value));
  if (decodeURIComponent(target.pathname) !== '/stock_manager_test' || (target.searchParams.get('schema') || 'public') !== 'public') {
    throw new Error('Las pruebas requieren una base exclusiva llamada stock_manager_test, esquema public.');
  }
  if (env.DATABASE_URL) {
    const dev = new URL(databaseUrl(env.DATABASE_URL));
    if (databaseIdentity(dev) === databaseIdentity(target)) throw new Error('La base de desarrollo y la de pruebas deben ser distintas.');
  }
  return value;
}
