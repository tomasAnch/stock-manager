import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cantidadValida, crearTexto, crearCSV, fechaArgentina } from '../../../frontend/src/features/reposicion/salidas.js';

const fecha = '2026-11-11T01:02:03.456Z';
const grupo = { proveedor: { nombre: 'Almacén Ñandú' }, items: [
  { codigo: '001', nombre: 'Harina', cantidad: '0.250', unidad: 'KG' },
  { codigo: '002', nombre: 'Yerba', cantidad: '12.000', unidad: 'UNIDAD' },
  { codigo: '003', nombre: 'Omitido', cantidad: '', unidad: 'KG', omitido: true },
] };

test('reposición: cantidades exactas, positivas, sin redondeos ni fracciones de unidad', () => {
  for (const [q, u] of [['0.001', 'KG'], ['0,250', 'KG'], ['999999999.999', 'KG'], ['12.000', 'UNIDAD']]) assert.equal(cantidadValida(q, u), true);
  for (const q of ['', '0', '0.000', '-1', '1e3', '1.0001', '1000000000', '1,2.3', ' 1', 1]) assert.equal(cantidadValida(q, 'KG'), false);
  assert.equal(cantidadValida('1.001', 'UNIDAD'), false);
  assert.equal(cantidadValida('1', 'LITRO'), false);
});

test('reposición: copia y CSV usan cantidad editada, omisiones y fecha del cálculo', () => {
  assert.equal(fechaArgentina(fecha), '2026-11-10 22:02:03-03:00');
  assert.equal(crearTexto(grupo, fecha), 'Proveedor: Almacén Ñandú\r\nFecha del cálculo: 2026-11-10 22:02:03-03:00\r\n\r\n001 — Harina: 0,250 kg\r\n002 — Yerba: 12 unidades');
  assert.equal(crearCSV(grupo, fecha), '\uFEFFproveedor;fecha_calculo;codigo;nombre;cantidad;unidad\r\nAlmacén Ñandú;2026-11-10 22:02:03-03:00;001;Harina;0,250;KG\r\nAlmacén Ñandú;2026-11-10 22:02:03-03:00;002;Yerba;12;UNIDAD\r\n');
  assert.deepEqual([...Buffer.from(crearCSV(grupo, fecha)).subarray(0, 3)], [239, 187, 191]);
});

test('CSV: escapa separadores, comillas y saltos; neutraliza fórmulas solo en la salida', () => {
  const peligro = { proveedor: { nombre: '  =SUM(1;2)' }, items: [{ codigo: '+001', nombre: '@"Ñandú";\r\nLínea', cantidad: '1', unidad: 'UNIDAD' }] };
  const antes = JSON.stringify(peligro);
  assert.equal(crearCSV(peligro, fecha).split('\r\n').slice(1).join('\r\n'), '"\'  =SUM(1;2)";2026-11-10 22:02:03-03:00;\'+001;"\'@""Ñandú"";\r\nLínea";1;UNIDAD\r\n');
  for (const nombre of ['-1+2', '\t+1', '\n@SUM(A1)', '=1', '   -1']) assert(crearCSV({ ...peligro, proveedor: { nombre } }, fecha).includes(`'${nombre}`));
  assert.equal(JSON.stringify(peligro), antes);
  assert(crearTexto(peligro, fecha).includes('Proveedor:   =SUM(1;2)'));
});

test('reposición: ninguna salida acepta lista vacía ni cantidades inválidas incluidas', () => {
  for (const salida of [crearTexto, crearCSV]) {
    assert.throws(() => salida({ ...grupo, items: [] }, fecha), /No quedan productos/);
    assert.throws(() => salida({ ...grupo, items: [{ ...grupo.items[1], cantidad: '2,5' }] }, fecha), /Revisá la cantidad de Yerba/);
    assert.throws(() => salida({ ...grupo, items: grupo.items.map(p => ({ ...p, omitido: true })) }, fecha), /No quedan productos/);
  }
});
