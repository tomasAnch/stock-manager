import test from 'node:test';
import assert from 'node:assert/strict';
import { validarSolicitud, registrarMovimiento } from '../../src/modules/inventario/movimientos.service.js';

const dueno = { usuarioId: '00000000-0000-4000-8000-000000000001', comercioId: '10000000-0000-4000-8000-000000000001', rol: 'DUENO' };
const empleado = { ...dueno, rol: 'EMPLEADO' };
const base = { productoId: '20000000-0000-4000-8000-000000000001', tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '2' };
const esValidacion = mensaje => error => error.name === 'ValidationError' && mensaje.test(error.message);
const esProhibido = error => error.status === 403 && error.code === 'FORBIDDEN';

// Cliente transaccional falso: si una validación previa falla, no debe haberse hecho ninguna consulta.
function txQueRegistra() {
  const llamadas = [];
  const registrar = nombre => (...args) => { llamadas.push(nombre); throw new Error(`No se esperaba ${nombre}`); };
  return { llamadas, tx: { $queryRaw: registrar('$queryRaw'), producto: { findUniqueOrThrow: registrar('producto'), updateMany: registrar('updateMany') }, usuario: { findFirst: registrar('usuario') }, movimientoStock: { create: registrar('create') } } };
}

test('inventario: la API habitual acepta reposición, salida y ajuste con sus tipos', () => {
  assert.deepEqual(validarSolicitud(base, empleado), { ...base, observacion: undefined });
  assert.equal(validarSolicitud({ ...base, tipo: 'EGRESO', motivo: 'SALIDA' }, empleado).motivo, 'SALIDA');
  for (const tipo of ['INGRESO', 'EGRESO']) assert.equal(validarSolicitud({ ...base, tipo, motivo: 'AJUSTE', observacion: 'Conteo' }, dueno).tipo, tipo);
});

test('inventario: STOCK_INICIAL y motivos desconocidos no se aceptan desde la API', () => {
  assert.throws(() => validarSolicitud({ ...base, motivo: 'STOCK_INICIAL' }, dueno), esValidacion(/solo se registra al crear el producto/));
  for (const motivo of ['VENTA', undefined, 'reposicion']) assert.throws(() => validarSolicitud({ ...base, motivo }, dueno), esValidacion(/Motivo inválido/));
});

test('inventario: combinaciones incompatibles y ajuste del empleado', () => {
  assert.throws(() => validarSolicitud({ ...base, tipo: 'EGRESO' }, dueno), esValidacion(/incompatibles/));
  assert.throws(() => validarSolicitud({ ...base, tipo: 'INGRESO', motivo: 'SALIDA' }, dueno), esValidacion(/incompatibles/));
  assert.throws(() => validarSolicitud({ ...base, tipo: 'SUMA', motivo: 'AJUSTE', observacion: 'x' }, dueno), esValidacion(/incompatibles/));
  // El permiso se informa antes que otros errores del ajuste.
  assert.throws(() => validarSolicitud({ ...base, motivo: 'AJUSTE' }, empleado), esProhibido);
});

test('inventario: el cliente no puede elegir responsable, fecha, saldo ni comercio', () => {
  for (const campo of ['usuarioId', 'creadoEn', 'stockActual', 'comercioId', 'id']) {
    assert.throws(() => validarSolicitud({ ...base, [campo]: 'x' }, dueno), esValidacion(/campos no permitidos/));
  }
  for (const body of [null, [], 'texto']) assert.throws(() => validarSolicitud(body, dueno), esValidacion(/objeto de datos/));
});

test('inventario: los rechazos previos no abren consultas ni escriben', async () => {
  const casos = [
    [dueno, { ...base, productoId: '' }, esValidacion(/Seleccioná un producto/)],
    [dueno, { ...base, tipo: 'EGRESO' }, esValidacion(/incompatibles/)],
    [empleado, { ...base, motivo: 'AJUSTE', observacion: 'x' }, esProhibido],
    [dueno, { ...base, motivo: 'STOCK_INICIAL' }, esProhibido],
    [dueno, { ...base, motivo: 'AJUSTE', observacion: '   ' }, esValidacion(/requiere una explicación/)],
    [dueno, { ...base, observacion: 'x'.repeat(501) }, esValidacion(/hasta 500/)],
    [dueno, { ...base, productoId: 'no-es-uuid' }, error => error.status === 404 && error.message === 'No se encontró el producto.'],
  ];
  for (const [auth, data, esperado] of casos) {
    const { llamadas, tx } = txQueRegistra();
    await assert.rejects(registrarMovimiento(tx, auth, data), esperado);
    assert.deepEqual(llamadas, []);
  }
});
