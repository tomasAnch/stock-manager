import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEmptyTestDatabase, PreflightError } from '../preflight-database.js';

test('preflight acepta base sin tablas y base migrada sin datos de negocio', async () => {
  await assertEmptyTestDatabase({ $queryRaw: async () => [] });
  let countQueries = 0;
  await assertEmptyTestDatabase({
    $queryRaw: async () => ['_prisma_migrations', 'comercios'].map(name => ({schema: 'public', name, kind: 'r'})),
    $queryRawUnsafe: async sql => { countQueries++; assert(sql.includes('"comercios"')); return [{ occupied: false }]; },
  });
  assert.equal(countQueries, 1);
});

test('preflight rechaza datos conocidos, tablas ajenas y relaciones fuera de public', async () => {
  await assert.rejects(assertEmptyTestDatabase({
    $queryRaw: async () => [{schema: 'public', name: 'comercios', kind: 'r'}],
    $queryRawUnsafe: async () => [{ occupied: true }],
  }), error => error instanceof PreflightError && error.message.includes('contiene datos'));
  for (const relation of [
    {schema: 'public', name: 'ajena', kind: 'r'},
    {schema: 'otro', name: 'comercios', kind: 'r'},
    {schema: 'public', name: 'comercios', kind: 'v'},
  ]) {
    await assert.rejects(assertEmptyTestDatabase({ $queryRaw: async () => [relation] }), /objetos ajenos/);
  }
});
