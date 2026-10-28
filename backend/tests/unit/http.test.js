import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../../src/app.js';

async function withServer(prisma, callback) {
  const server = createApp({ prisma }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('health devuelve disponibilidad sin exponer datos del comercio', async () => {
  await withServer({ comercio: { count: async () => 2 } }, async url => {
    const res = await fetch(`${url}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', database: 'connected' });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('cache-control'), 'no-store');
  });
});
test('base no disponible responde 503 y no filtra errores internos', async () => {
  await withServer({ comercio: { count: async () => { throw new Error('password=secreto'); } } }, async url => {
    const res = await fetch(`${url}/api/health`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { status: 'unavailable', database: 'unavailable' });
  });
});
test('404, JSON mal formado y cuerpos excesivos tienen errores JSON controlados', async () => {
  await withServer({}, async url => {
    const missing = await fetch(`${url}/api/no-existe`);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'NOT_FOUND');
    const malformed = await fetch(`${url}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const large = await fetch(`${url}/api/health`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: 'a'.repeat(40000) }) });
    assert.equal(large.status, 413);
  });
});
