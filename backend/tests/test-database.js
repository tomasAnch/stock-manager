import { databaseUrl } from '../src/lib/config.js';

export function requireTestDatabase(env = process.env) {
  const value = env.TEST_DATABASE_URL;
  if (!value) throw new Error('Falta TEST_DATABASE_URL; no se usa DATABASE_URL como reemplazo.');
  const target = new URL(databaseUrl(value));
  if (decodeURIComponent(target.pathname) !== '/stock_manager_test' || (target.searchParams.get('schema') || 'public') !== 'public') {
    throw new Error('Las pruebas requieren una base exclusiva llamada stock_manager_test, esquema public.');
  }
  if (env.DATABASE_URL) {
    const dev = new URL(databaseUrl(env.DATABASE_URL));
    const key = url => `${url.hostname.toLowerCase().replace(/^localhost$/, '127.0.0.1')}:${url.port || '5432'}${decodeURIComponent(url.pathname)}`;
    if (key(dev) === key(target)) throw new Error('La base de desarrollo y la de pruebas deben ser distintas.');
  }
  return value;
}
