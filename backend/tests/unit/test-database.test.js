import test from 'node:test';
import assert from 'node:assert/strict';
import { requireTestDatabase } from '../test-database.js';

test('nunca usa desarrollo como base de pruebas por omisión o alias localhost', () => {
  assert.throws(() => requireTestDatabase({ DATABASE_URL: 'postgresql://u:p@localhost/stock_manager' }), /Falta TEST/);
  assert.throws(() => requireTestDatabase({ TEST_DATABASE_URL: 'postgresql://u:p@localhost/stock_manager' }), /exclusiva/);
  assert.throws(() => requireTestDatabase({ TEST_DATABASE_URL: 'postgresql://u:p@localhost/stock_manager_test', DATABASE_URL: 'postgresql://u:otro@127.0.0.1:5432/stock_manager_test' }), /distintas/);
  assert.equal(requireTestDatabase({ TEST_DATABASE_URL: 'postgresql://u:p@localhost/stock_manager_test' }), 'postgresql://u:p@localhost/stock_manager_test');
});
