import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, parseQuantity, ValidationError } from '../../src/lib/validation.js';
import { databaseUrl, serverConfig } from '../../src/lib/config.js';

test('normaliza espacios y Unicode, conservando mayúsculas y tildes visibles', () => {
  assert.deepEqual(normalizeName('  ALMACE\u0301N   Seco '), { nombre: 'ALMACÉN Seco', nombreNormalizado: 'almacén seco' });
  assert.notEqual(normalizeName('Almacén').nombreNormalizado, normalizeName('Almacen').nombreNormalizado);
  for (const value of ['', '   ', null, 'a'.repeat(121)]) assert.throws(() => normalizeName(value), ValidationError);
});
test('cantidades decimales exactas y serialización como texto', () => {
  const amount = parseQuantity('0.250', 'KG');
  assert.equal(amount.plus('0.100').toFixed(3), '0.350');
  assert.equal(typeof JSON.parse(JSON.stringify({ amount })).amount, 'string');
  assert.equal(parseQuantity('2.000', 'UNIDAD').toString(), '2');
  assert.equal(parseQuantity('0', 'UNIDAD', { allowZero: true }).toString(), '0');
  assert.equal(parseQuantity('999999999.999', 'KG').toFixed(3), '999999999.999');
});
test('rechaza redondeos, notación científica, tipos y rangos inválidos', () => {
  for (const value of ['0', '-1', '0.0005', '1000000000', '1e2', '0,25', '', ' 1 ', 'NaN', 1, null]) {
    assert.throws(() => parseQuantity(value, 'KG'), ValidationError);
  }
  assert.throws(() => parseQuantity('2.5', 'UNIDAD'), ValidationError);
  assert.throws(() => parseQuantity('1', 'LITRO'), ValidationError);
});
test('configuración inválida falla sin imprimir credenciales', () => {
  assert.throws(() => databaseUrl('https://example.invalid'), /PostgreSQL/);
  assert.throws(() => databaseUrl('secreto-invalido'), error => !error.message.includes('secreto-invalido'));
  assert.throws(() => serverConfig({ PORT: '0' }), /PORT/);
  assert.throws(() => serverConfig({ FRONTEND_ORIGIN: 'https://example.invalid/ruta' }), /ORIGIN/);
  assert.equal(serverConfig({}).port, 3001);
});
