import test from 'node:test';
import assert from 'node:assert/strict';
import { safeErrorDetails } from '../../src/lib/error-details.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { requireDemoSeed, SeedError } from '../../prisma/seed-errors.js';
import { seedDemo } from '../../prisma/seed-data.js';

function sensitiveError() {
  const error = new Error('postgresql://usuario:secreto@db/produccion');
  error.code = 'P2021';
  error.meta = { password: 'secreto' };
  error.cause = { message: 'Authorization: secreto' };
  error.stack = `${error.message}\n    at funcionSecreta (C:/equipo/backend/src/app.js:12:3)`;
  return error;
}

test('diagnóstico conserva tipo, código y ubicación, pero no mensaje, metadatos ni ruta completa', () => {
  assert.deepEqual(safeErrorDetails(sensitiveError()), { type: 'Error', code: 'P2021', locations: ['app.js:12:3'] });
  assert.deepEqual(safeErrorDetails({ name: 'secreto', code: 'postgresql://secreto', stack: 'secreto' }), { type: 'Error' });
});

test('500 registra diagnóstico controlado sin filtrar el error ni la solicitud', () => {
  let logged;
  const logger = { error: (...args) => { logged = args; } };
  const res = { status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  errorHandler(logger)(sensitiveError(), { body: 'secreto', headers: { authorization: 'secreto' } }, res, () => {});
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.equal(logged[1].code, 'P2021');
  assert(!JSON.stringify([logged, res.body]).includes('secreto'));
});

test('seed requiere habilitación exacta y producción siempre prevalece', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1']) {
    assert.throws(() => requireDemoSeed({ ALLOW_DEMO_SEED: value }), error => error instanceof SeedError && error.code === 'NOT_ENABLED');
  }
  assert.throws(() => requireDemoSeed({ NODE_ENV: 'production', ALLOW_DEMO_SEED: 'true' }), error => error.code === 'PRODUCTION');
  assert.doesNotThrow(() => requireDemoSeed({ NODE_ENV: 'development', ALLOW_DEMO_SEED: 'true' }));
});

test('seed informa contraseñas inválidas antes de consultar la base', async () => {
  for (const password of [undefined, 'corta', 'ñ'.repeat(37)]) {
    await assert.rejects(seedDemo({}, { ownerPassword: password, employeePassword: 'clave-prueba-123' }), error => {
      assert(error instanceof SeedError);
      assert.equal(error.code, 'PASSWORD');
      assert.match(error.message, /12 caracteres.*72 bytes/);
      return true;
    });
  }
});
