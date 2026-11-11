import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { createPrisma } from '../../src/lib/prisma.js';
import { createApp } from '../../src/app.js';
import { seedDemo, demoStores } from '../../prisma/seed-data.js';
import { requireTestDatabase } from '../test-database.js';
import express from 'express';
import { requireAuth, requireRole } from '../../src/middlewares/autenticacion.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { buscarDelComercio } from '../../src/modules/acceso/comercio.js';
import { ValidationError } from '../../src/lib/validation.js';

// El runner ya reemplazó DATABASE_URL después de comprobar que era distinta.
const prisma = createPrisma(requireTestDatabase({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL }));
const auth = { secret: 'secreto-solo-para-integracion-0123456789', expiresIn: '8h' };
let ownsFixtures = false;
before(async () => {
  for (const model of ['movimientoStock', 'producto', 'usuario', 'categoria', 'proveedor', 'comercio']) {
    assert.equal(await prisma[model].count(), 0, 'La base exclusiva de pruebas debe estar sin datos; no se borran datos preexistentes.');
  }
  ownsFixtures = true;
});
after(async () => {
  try {
    if (ownsFixtures) {
      await prisma.$transaction(async tx => {
        for (const model of ['movimientoStock', 'producto', 'usuario', 'categoria', 'proveedor', 'comercio']) await tx[model].deleteMany();
      });
    }
  } finally { await prisma.$disconnect(); }
});
test('migración instala seis tablas y siete CHECK validados', async () => {
  const checks = await prisma.$queryRaw`SELECT conname FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='c' AND c.convalidated AND n.nspname='public' AND t.relname IN ('productos','movimientos_stock')`;
  assert.equal(checks.length, 7);
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name <> '_prisma_migrations'`;
  assert.equal(tables.length, 6);
});
test('seed repetible, hashes válidos, referencias en dos comercios y sin restablecer cuentas', async () => {
  const passwords = { ownerPassword: 'solo-test-dueno-123', employeePassword: 'solo-test-empleado-456' };
  await seedDemo(prisma, passwords);
  const original = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'dueno.a@example.invalid' } });
  await seedDemo(prisma, { ...passwords, ownerPassword: 'otra-clave-test-789' });
  assert.equal(await prisma.comercio.count(), 2);
  assert.equal(await prisma.usuario.count(), 4);
  assert.equal(await prisma.categoria.count(), 2);
  assert.equal(await prisma.proveedor.count(), 2);
  const owner = await prisma.usuario.findUniqueOrThrow({ where: { correo: original.correo } });
  assert.equal(owner.passwordHash, original.passwordHash);
  assert(await bcrypt.compare(passwords.ownerPassword, owner.passwordHash));
  for (const store of demoStores) assert.equal(await prisma.usuario.count({ where: { comercioId: store.id } }), 2);
});
test('escritura y lectura con cliente generado y rollback real', async () => {
  const rollback = new Error('revertir prueba');
  await assert.rejects(prisma.$transaction(async tx => {
    const store = await tx.comercio.create({ data: { nombre: 'Temporal' } });
    assert.equal((await tx.comercio.findUniqueOrThrow({ where: { id: store.id } })).nombre, 'Temporal');
    throw rollback;
  }), error => error === rollback);
  assert.equal(await prisma.comercio.count({ where: { nombre: 'Temporal' } }), 0);
});
test('restricción de stock rechaza escritura inválida desde Prisma', async () => {
  const commerce = demoStores[0].id;
  const category = await prisma.categoria.findFirstOrThrow({ where: { comercioId: commerce } });
  const supplier = await prisma.proveedor.findFirstOrThrow({ where: { comercioId: commerce } });
  await assert.rejects(
    prisma.producto.create({ data: {
      comercioId: commerce, categoriaId: category.id, proveedorId: supplier.id,
      codigo: 'INVALIDO', nombre: 'Inválido', unidad: 'UNIDAD', stockActual: '-1',
    } }),
    error => {
      assert.match(error.message, /productos_stock_actual_no_negativo/);
      return true;
    },
  );
  assert.equal(await prisma.producto.count(), 0);
});
test('HTTP consulta PostgreSQL mediante el cliente generado', async () => {
  const server = createApp({ prisma, auth }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', database: 'connected' });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
async function login(url, correo, contrasena) {
  return fetch(`${url}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo, contrasena }) });
}
const sesion = (url, token) => fetch(`${url}/api/auth/sesion`, { headers: { Authorization: `Bearer ${token}` } });

// Usa las cuentas del seed de la prueba anterior (contraseñas solo-test-*).
test('acceso con PostgreSQL: login, sesión y rechazo inmediato al desactivar la cuenta', async () => {
  await withServer(createApp({ prisma, auth }), async url => {
    assert.equal((await login(url, 'dueno.a@example.invalid', 'clave-equivocada')).status, 401);
    const res = await login(url, 'DUENO.A@example.invalid', 'solo-test-dueno-123');
    assert.equal(res.status, 200);
    const { token, usuario } = await res.json();
    assert.equal(usuario.rol, 'DUENO');
    assert.equal(usuario.comercio.id, demoStores[0].id);
    assert.equal((await sesion(url, token)).status, 200);

    await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: false } });
    const rechazada = await sesion(url, token);
    assert.equal(rechazada.status, 401);
    assert.equal((await rechazada.json()).error.code, 'INVALID_SESSION');
    assert.equal((await login(url, 'dueno.a@example.invalid', 'solo-test-dueno-123')).status, 401);
    await prisma.usuario.update({ where: { id: usuario.id }, data: { activo: true } });
    assert.equal((await sesion(url, token)).status, 200);
  });
});

test('acceso con PostgreSQL: permisos por rol y registros de otro comercio', async () => {
  const app = express();
  app.get('/prueba/solo-dueno', requireAuth({ prisma, auth }), requireRole('DUENO'), (_req, res) => res.json({ ok: true }));
  app.get('/prueba/categorias/:id', requireAuth({ prisma, auth }), async (req, res) => {
    res.json(await buscarDelComercio(prisma.categoria, req.params.id, req.auth, { select: { id: true, nombre: true } }));
  });
  app.use(errorHandler({ error() {} }));
  const propia = await prisma.categoria.findFirstOrThrow({ where: { comercioId: demoStores[0].id } });
  const ajena = await prisma.categoria.findFirstOrThrow({ where: { comercioId: demoStores[1].id } });

  await withServer(createApp({ prisma, auth }), async apiUrl => {
    const { token } = await (await login(apiUrl, 'empleado.a@example.invalid', 'solo-test-empleado-456')).json();
    await withServer(app, async url => {
      const headers = { Authorization: `Bearer ${token}` };
      assert.equal((await fetch(`${url}/prueba/solo-dueno`, { headers })).status, 403);
      const mismaTienda = await fetch(`${url}/prueba/categorias/${propia.id}`, { headers });
      assert.equal(mismaTienda.status, 200);
      assert.equal((await mismaTienda.json()).id, propia.id);
      const otraTienda = await fetch(`${url}/prueba/categorias/${ajena.id}`, { headers });
      // Mismo 404 genérico que un ID inexistente: no revela que existe en otro comercio.
      assert.equal(otraTienda.status, 404);
      assert.deepEqual(await otraTienda.json(), { error: { code: 'NOT_FOUND', message: 'No se encontró el registro.' } });
    });
  });
});

// Etapa 3: servicios reales, API y concurrencia sobre PostgreSQL.
const { guardar, cambiarActividad } = await import('../../src/modules/catalogo/catalogo.service.js');
const { registrarMovimiento } = await import('../../src/modules/inventario/movimientos.service.js');
async function contextoCatalogo() {
  const user = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'dueno.a@example.invalid' } });
  const categoria = await prisma.categoria.findFirstOrThrow({ where: { comercioId: user.comercioId, activo: true } });
  const proveedor = await prisma.proveedor.findFirstOrThrow({ where: { comercioId: user.comercioId, activo: true } });
  return { identidad: { usuarioId: user.id, comercioId: user.comercioId, rol: user.rol }, datos: { codigo: 'TEST', nombre: 'Producto test', unidad: 'UNIDAD', categoriaId: categoria.id, proveedorId: proveedor.id, stockMinimo: '2', stockObjetivo: '5', stockInicial: '3' } };
}
test('catálogo: alta atómica, baja conserva saldo y unidad con historial estable', async () => {
  const { identidad, datos } = await contextoCatalogo();
  const p = await guardar(prisma, 'producto', identidad, { ...datos, codigo: ' ini001 ' });
  assert.equal(p.codigo, 'INI001'); assert.equal(p.stockActual.toString(), '3');
  const movimientos = await prisma.movimientoStock.findMany({ where: { productoId: p.id } });
  assert.equal(movimientos.length, 1); assert.equal(movimientos[0].motivo, 'STOCK_INICIAL');
  assert.equal(movimientos[0].usuarioId, identidad.usuarioId);
  const { stockInicial, ...edicion } = datos;
  await assert.rejects(guardar(prisma, 'producto', identidad, { ...edicion, unidad: 'KG' }, p.id), /unidad/);
  await cambiarActividad(prisma, 'producto', identidad, p.id, { activo: false });
  assert.equal((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual.toString(), '3');
  await cambiarActividad(prisma, 'producto', identidad, p.id, { activo: true });
  await assert.rejects(guardar(prisma, 'producto', identidad, { ...datos, codigo: 'INI001' }), e => e.status === 409);
});
test('catálogo: cero sin movimiento, kg exactos y reversión si falla el movimiento inicial', async () => {
  const { identidad, datos } = await contextoCatalogo();
  const cero = await guardar(prisma, 'producto', identidad, { ...datos, codigo: 'CERO', stockInicial: '0' });
  assert.equal(await prisma.movimientoStock.count({ where: { productoId: cero.id } }), 0);
  const { stockInicial, ...edicion } = datos;
  await guardar(prisma, 'producto', identidad, { ...edicion, codigo: 'CERO', unidad: 'KG' }, cero.id);
  const kg = await guardar(prisma, 'producto', identidad, { ...datos, codigo: 'PESO', unidad: 'KG', stockInicial: '0.250' });
  assert.equal(kg.stockActual.toString(), '0.25');
  await assert.rejects(guardar(prisma, 'producto', { ...identidad, usuarioId: '00000000-0000-4000-8000-000000000000' }, { ...datos, codigo: 'ROLLBACK' }), e => e.status === 401 && e.code === 'INVALID_SESSION');
  assert.equal(await prisma.producto.count({ where: { codigo: 'ROLLBACK' } }), 0);
  for (const [cambios, mensaje] of [[{ stockInicial: '0.5' }, /Stock inicial/], [{ stockObjetivo: '1' }, /objetivo no puede/], [{ stockActual: '999' }, /campos no permitidos/], [{ codigo: 'CON ESPACIO' }, /Código inválido/], [{ stockInicial: '0.0001', unidad: 'KG' }, /Stock inicial/]]) await assert.rejects(guardar(prisma, 'producto', identidad, { ...datos, ...cambios }), e => e instanceof ValidationError && mensaje.test(e.message));
});
test('catálogo: normalización, referencias inactivas y reactivación con reasignación', async () => {
  const { identidad, datos } = await contextoCatalogo();
  const categoria = await guardar(prisma, 'categoria', identidad, { nombre: '  Secos   Únicos ' });
  assert.equal(categoria.nombreNormalizado, 'secos únicos');
  await assert.rejects(guardar(prisma, 'categoria', identidad, { nombre: 'SECOS ÚNICOS' }), e => e.status === 409);
  const p = await guardar(prisma, 'producto', identidad, { ...datos, codigo: 'REFERENCIAS', categoriaId: categoria.id });
  await assert.rejects(cambiarActividad(prisma, 'categoria', identidad, categoria.id, { activo: false }), e => e.status === 409);
  await cambiarActividad(prisma, 'producto', identidad, p.id, { activo: false });
  await cambiarActividad(prisma, 'categoria', identidad, categoria.id, { activo: false });
  await assert.rejects(cambiarActividad(prisma, 'producto', identidad, p.id, { activo: true }), e => e.status === 409);
  const { stockInicial, ...edicion } = datos;
  await guardar(prisma, 'producto', identidad, { ...edicion, codigo: 'REFERENCIAS' }, p.id);
  await cambiarActividad(prisma, 'producto', identidad, p.id, { activo: true });
});
test('catálogo: alta y baja concurrentes no dejan referencias inactivas en productos activos', async () => {
  const { identidad, datos } = await contextoCatalogo();
  for (const modelo of ['categoria', 'proveedor']) {
    const ref = await guardar(prisma, modelo, identidad, { nombre: `Carrera ${modelo}` });
    const results = await Promise.allSettled([
      guardar(prisma, 'producto', identidad, { ...datos, codigo: `CARRERA-${modelo}`, [modelo === 'categoria' ? 'categoriaId' : 'proveedorId']: ref.id }),
      cambiarActividad(prisma, modelo, identidad, ref.id, { activo: false }),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const actual = await prisma[modelo].findUnique({ where: { id: ref.id } });
    const productos = await prisma.producto.count({ where: { activo: true, [modelo === 'categoria' ? 'categoriaId' : 'proveedorId']: ref.id } });
    assert(actual.activo || productos === 0);
  }
});
test('inventario compartido: dos salidas simultáneas solo descuentan una y un fallo posterior revierte saldo', async () => {
  const { identidad, datos } = await contextoCatalogo();
  const p = await guardar(prisma, 'producto', identidad, { ...datos, codigo: 'CONCURRENCIA' });
  const movimiento = { productoId: p.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '3' };
  const results = await Promise.allSettled([1, 2].map(() => prisma.$transaction(tx => registrarMovimiento(tx, identidad, movimiento))));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual.toString(), '0');
  await assert.rejects(prisma.$transaction(async tx => { await registrarMovimiento(tx, identidad, { ...movimiento, tipo: 'INGRESO', motivo: 'REPOSICION' }); throw new Error('Fallo posterior'); }));
  assert.equal((await prisma.producto.findUnique({ where: { id: p.id } })).stockActual.toString(), '0');
  assert.equal(await prisma.movimientoStock.count({ where: { productoId: p.id } }), 2);
});
test('API catálogo: empleado consulta sin editar; comercio ajeno no se lee ni se asigna; validaciones HTTP', async () => {
  const { identidad, datos } = await contextoCatalogo();
  await withServer(createApp({ prisma, auth }), async url => {
    const owner = await (await login(url, 'dueno.a@example.invalid', 'solo-test-dueno-123')).json();
    const employee = await (await login(url, 'empleado.a@example.invalid', 'solo-test-empleado-456')).json();
    const request = (path, method = 'GET', body, token = owner.token) => fetch(`${url}/api/catalogo/${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const res = await request('productos?estado=todos', 'GET', undefined, employee.token);
    assert.equal(res.status, 200); const listado = await res.json();
    assert(listado.items.every(p => p.comercioId === identidad.comercioId));
    assert.equal(typeof listado.items[0].stockActual, 'string');
    for (const recurso of ['productos', 'categorias', 'proveedores']) assert.equal((await request(recurso, 'POST', { nombre: 'No permitido' }, employee.token)).status, 403);
    const ajena = await prisma.categoria.findFirstOrThrow({ where: { comercioId: demoStores[1].id } });
    assert.equal((await request('productos', 'POST', { ...datos, codigo: 'AJENO', categoriaId: ajena.id })).status, 404);
    assert.equal((await request(`categorias/${ajena.id}`, 'PUT', { nombre: 'Alterada' })).status, 404);
    assert.equal((await request('productos', 'POST', { ...datos, stockActual: '4' })).status, 400);
    for (const [campo, mensaje] of [['categoriaId', /Seleccioná categoría/], ['proveedorId', /Seleccioná proveedor/], ['stockMinimo', /Stock mínimo/], ['stockObjetivo', /Stock objetivo/], ['stockInicial', /Stock inicial/]]) {
      const response = await request('productos', 'POST', { ...datos, [campo]: '' });
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.error.code, 'VALIDATION_ERROR');
      assert.match(body.error.message, mensaje);
    }
    assert.equal((await request('productos?pagina=0')).status, 400);
    assert.equal((await request('productos?q=INI001')).status, 200);
  });
});

// Etapa 4: movimientos e historial con la API real y PostgreSQL.
const { crearMovimiento } = await import('../../src/modules/inventario/movimientos.service.js');
async function identidadDe(correo) {
  const u = await prisma.usuario.findUniqueOrThrow({ where: { correo } });
  return { usuarioId: u.id, comercioId: u.comercioId, rol: u.rol };
}
async function productoDePrueba(codigo, cambios = {}, correo = 'dueno.a@example.invalid') {
  const identidad = await identidadDe(correo);
  const categoria = await prisma.categoria.findFirstOrThrow({ where: { comercioId: identidad.comercioId, activo: true } });
  const proveedor = await prisma.proveedor.findFirstOrThrow({ where: { comercioId: identidad.comercioId, activo: true } });
  return guardar(prisma, 'producto', identidad, { codigo, nombre: `Producto ${codigo}`, unidad: 'UNIDAD', categoriaId: categoria.id, proveedorId: proveedor.id, stockMinimo: '0', stockObjetivo: '0', stockInicial: '0', ...cambios });
}
const saldo = async id => (await prisma.producto.findUniqueOrThrow({ where: { id } })).stockActual.toString();
const contar = id => prisma.movimientoStock.count({ where: { productoId: id } });
async function conInventario(callback) {
  await withServer(createApp({ prisma, auth }), async url => {
    const tokens = {
      dueno: (await (await login(url, 'dueno.a@example.invalid', 'solo-test-dueno-123')).json()).token,
      empleado: (await (await login(url, 'empleado.a@example.invalid', 'solo-test-empleado-456')).json()).token,
    };
    const api = async (path, method = 'GET', body, quien = 'dueno') => {
      const res = await fetch(`${url}/api/inventario/${path}`, { method, headers: { Authorization: `Bearer ${tokens[quien]}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: res.status, body: await res.json() };
    };
    await callback(api);
  });
}
const esperarError = (res, status, code, mensaje) => {
  assert.equal(res.status, status, JSON.stringify(res.body));
  assert.equal(res.body.error.code, code);
  if (mensaje) assert.match(res.body.error.message, mensaje);
};

test('API inventario: reposición y salida para ambos roles, ajuste solo del dueño con explicación', async () => {
  const p = await productoDePrueba('MOV-ROLES', { stockInicial: '5' });
  const empleado = await identidadDe('empleado.a@example.invalid');
  await conInventario(async api => {
    let res = await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '2' }, 'empleado');
    assert.equal(res.status, 201);
    assert.equal(res.body.producto.stockActual, '7');
    assert.deepEqual(Object.keys(res.body.movimiento).sort(), ['cantidad', 'creadoEn', 'id', 'motivo', 'observacion', 'tipo', 'usuario']);
    assert.deepEqual(res.body.movimiento.usuario, { nombre: 'empleado de prueba A' });
    assert.equal((await prisma.movimientoStock.findUniqueOrThrow({ where: { id: res.body.movimiento.id } })).usuarioId, empleado.usuarioId);
    res = await api('movimientos', 'POST', { productoId: p.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '1' }, 'empleado');
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '6');

    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'AJUSTE', cantidad: '1', observacion: 'Conteo' }, 'empleado'), 403, 'FORBIDDEN', /Solo el dueño/);
    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'EGRESO', motivo: 'AJUSTE', cantidad: '1' }), 400, 'VALIDATION_ERROR', /requiere una explicación/);
    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'EGRESO', motivo: 'AJUSTE', cantidad: '1', observacion: '  \n ' }), 400, 'VALIDATION_ERROR', /requiere una explicación/);
    assert.equal(await saldo(p.id), '6');
    res = await api('movimientos', 'POST', { productoId: p.id, tipo: 'EGRESO', motivo: 'AJUSTE', cantidad: '2', observacion: '  Conteo físico: faltaban 2  ' });
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '4');
    assert.equal(res.body.movimiento.observacion, 'Conteo físico: faltaban 2');
    res = await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'AJUSTE', cantidad: '1', observacion: 'Apareció en depósito' });
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '5');

    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'STOCK_INICIAL', cantidad: '1' }), 400, 'VALIDATION_ERROR', /solo se registra al crear el producto/);
    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'EGRESO', motivo: 'REPOSICION', cantidad: '1' }), 400, 'VALIDATION_ERROR', /incompatibles/);
    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'SALIDA', cantidad: '1' }, 'empleado'), 400, 'VALIDATION_ERROR', /incompatibles/);
    esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'VENTA', cantidad: '1' }), 400, 'VALIDATION_ERROR', /Motivo inválido/);
    for (const campo of ['usuarioId', 'creadoEn', 'stockActual', 'comercioId']) {
      esperarError(await api('movimientos', 'POST', { productoId: p.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '1', [campo]: empleado.usuarioId }), 400, 'VALIDATION_ERROR', /campos no permitidos/);
    }
    esperarError(await api('movimientos', 'POST', { tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '1' }), 400, 'VALIDATION_ERROR', /Seleccioná un producto/);
    // Los movimientos no se editan ni se borran: no existen esas rutas.
    for (const method of ['PUT', 'PATCH', 'DELETE']) esperarError(await api(`movimientos/${res.body.movimiento.id}`, method, {}), 404, 'NOT_FOUND', /Ruta no encontrada/);
    assert.equal(await saldo(p.id), '5');
    assert.equal(await contar(p.id), 5);
  });
});

test('API inventario: cantidades exactas, rango, saldo insuficiente y producto inactivo', async () => {
  const u = await productoDePrueba('MOV-UNIDAD', { stockInicial: '5' });
  const kg = await productoDePrueba('MOV-KG', { unidad: 'KG', stockInicial: '1.5' });
  const lleno = await productoDePrueba('MOV-LLENO', { unidad: 'KG', stockInicial: '999999999.999' });
  const baja = await productoDePrueba('MOV-BAJA', { stockInicial: '4' });
  await cambiarActividad(prisma, 'producto', await identidadDe('dueno.a@example.invalid'), baja.id, { activo: false });
  await conInventario(async api => {
    const mover = (producto, cantidad, extra = {}) => api('movimientos', 'POST', { productoId: producto.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad, ...extra }, 'empleado');
    for (const cantidad of ['1.5', '2.001', '0', '-1', '1e3', '1,5', '', '1234567890', 2]) esperarError(await mover(u, cantidad), 400, 'VALIDATION_ERROR', /Cantidad: ingresá un número entero mayor a cero/);
    for (const cantidad of ['0.0001', '0', '-0.5']) esperarError(await mover(kg, cantidad), 400, 'VALIDATION_ERROR', /Cantidad: ingresá un número mayor a cero, con hasta 9 enteros y 3 decimales/);
    let res = await mover(u, '2.000');
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '7');
    res = await mover(kg, '0.250');
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '1.75');
    res = await api('movimientos', 'POST', { productoId: kg.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '1.75' }, 'empleado');
    assert.equal(res.status, 201); assert.equal(res.body.producto.stockActual, '0');
    esperarError(await mover(lleno, '0.001'), 400, 'VALIDATION_ERROR', /saldo máximo/);
    esperarError(await api('movimientos', 'POST', { productoId: u.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '8' }, 'empleado'), 409, 'CONFLICT', /No hay stock suficiente. Saldo disponible: 7 unidades/);
    esperarError(await mover(baja, '1'), 409, 'CONFLICT', /inactivo/);
    esperarError(await api('movimientos', 'POST', { productoId: baja.id, tipo: 'EGRESO', motivo: 'AJUSTE', cantidad: '1', observacion: 'x' }), 409, 'CONFLICT', /inactivo/);
    assert.deepEqual([await saldo(u.id), await saldo(kg.id), await saldo(lleno.id), await saldo(baja.id)], ['7', '0', '999999999.999', '4']);
  });
});

test('API inventario: otro comercio no se mueve ni se consulta, con la misma respuesta que un ID inexistente', async () => {
  const ajeno = await productoDePrueba('MOV-AJENO', { stockInicial: '3' }, 'dueno.b@example.invalid');
  await conInventario(async api => {
    const inexistente = '30000000-0000-4000-8000-000000000099';
    for (const id of [ajeno.id, inexistente, 'no-es-un-id']) {
      const mov = await api('movimientos', 'POST', { productoId: id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '1' }, 'empleado');
      assert.equal(mov.status, 404); assert.deepEqual(mov.body, { error: { code: 'NOT_FOUND', message: 'No se encontró el producto.' } });
      const hist = await api(`productos/${id}/movimientos`, 'GET', undefined, 'empleado');
      assert.equal(hist.status, 404); assert.deepEqual(hist.body, { error: { code: 'NOT_FOUND', message: 'No se encontró el producto.' } });
    }
  });
  assert.equal(await saldo(ajeno.id), '3');
  assert.equal(await contar(ajeno.id), 1);
});

test('API inventario: dos egresos simultáneos de 3 sobre saldo 3 confirman uno solo', async () => {
  for (let ronda = 0; ronda < 5; ronda++) {
    const p = await productoDePrueba(`MOV-CARRERA-${ronda}`, { stockInicial: '3' });
    await conInventario(async api => {
      const salida = { productoId: p.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '3' };
      const res = await Promise.all([api('movimientos', 'POST', salida, 'dueno'), api('movimientos', 'POST', salida, 'empleado')]);
      assert.deepEqual(res.map(r => r.status).sort(), [201, 409]);
      esperarError(res.find(r => r.status === 409), 409, 'CONFLICT', /No hay stock suficiente. Saldo disponible: 0/);
    });
    assert.equal(await saldo(p.id), '0');
    assert.equal(await contar(p.id), 2);
  }
});

test('inventario: si falla la inserción del movimiento después de actualizar el saldo, se revierte todo', async () => {
  const p = await productoDePrueba('MOV-FALLO', { stockInicial: '4' });
  const identidad = await identidadDe('dueno.a@example.invalid');
  let saldoDentroDeLaTransaccion;
  // El insert recibe un responsable inexistente: PostgreSQL rechaza la clave foránea (P2003)
  // cuando el saldo ya fue descontado dentro de la transacción.
  await assert.rejects(prisma.$transaction(async tx => {
    const roto = new Proxy(tx, {
      get(target, key) {
        if (key === 'movimientoStock') return { create: async args => {
          saldoDentroDeLaTransaccion = (await target.producto.findUniqueOrThrow({ where: { id: p.id } })).stockActual.toString();
          return target.movimientoStock.create({ ...args, data: { ...args.data, usuarioId: '00000000-0000-4000-8000-000000000000' } });
        } };
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await registrarMovimiento(roto, identidad, { productoId: p.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '3' });
  }), error => error.code === 'P2003');
  assert.equal(saldoDentroDeLaTransaccion, '1');
  assert.equal(await saldo(p.id), '4');
  assert.equal(await contar(p.id), 1);
});

test('inventario: el bloqueo del producto coordina movimientos con la baja y el cambio de unidad', async () => {
  const identidad = await identidadDe('empleado.a@example.invalid');
  const dueno = await identidadDe('dueno.a@example.invalid');
  // Una transacción toma el producto, espera y lo cambia; el movimiento simultáneo debe esperar y ver el cambio.
  async function conProductoTomado(id, cambio, movimiento) {
    let avisar; const tomado = new Promise(resolve => { avisar = resolve; });
    const retencion = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM productos WHERE id = ${id}::uuid FOR UPDATE`;
      avisar(); await new Promise(resolve => setTimeout(resolve, 400));
      await tx.producto.update({ where: { id }, data: cambio });
    });
    await tomado;
    const inicio = Date.now();
    const resultado = await crearMovimiento(prisma, identidad, movimiento).then(r => ({ ok: r }), error => ({ error }));
    await retencion;
    return { ...resultado, espera: Date.now() - inicio };
  }
  const sinHistorial = await productoDePrueba('MOV-UNIDAD-CAMBIA');
  let r = await conProductoTomado(sinHistorial.id, { unidad: 'KG' }, { productoId: sinHistorial.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '1.5' });
  assert(r.espera >= 300, `el movimiento no esperó el bloqueo (${r.espera} ms)`);
  assert.equal(r.ok.producto.unidad, 'KG'); assert.equal(r.ok.producto.stockActual.toString(), '1.5');

  const conSaldo = await productoDePrueba('MOV-BAJA-SIMULTANEA', { stockInicial: '4' });
  r = await conProductoTomado(conSaldo.id, { activo: false }, { productoId: conSaldo.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '1' });
  assert(r.espera >= 300);
  assert.equal(r.error.status, 409); assert.match(r.error.message, /inactivo/);
  assert.equal(await saldo(conSaldo.id), '4');

  // Carreras reales con las operaciones de Catálogo: nunca un error inesperado ni un estado inválido.
  for (let ronda = 0; ronda < 5; ronda++) {
    const p = await productoDePrueba(`MOV-RACE-U-${ronda}`);
    const [edicion, mov] = await Promise.allSettled([
      guardar(prisma, 'producto', dueno, { codigo: p.codigo, nombre: p.nombre, unidad: 'KG', categoriaId: p.categoriaId, proveedorId: p.proveedorId, stockMinimo: '0', stockObjetivo: '0' }, p.id),
      crearMovimiento(prisma, identidad, { productoId: p.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '2' }),
    ]);
    assert.equal(mov.status, 'fulfilled');
    if (edicion.status === 'rejected') { assert.equal(edicion.reason.status, 409); assert.match(edicion.reason.message, /unidad/); }
    assert.equal((await prisma.producto.findUniqueOrThrow({ where: { id: p.id } })).unidad, edicion.status === 'fulfilled' ? 'KG' : 'UNIDAD');
    const q = await productoDePrueba(`MOV-RACE-B-${ronda}`, { stockInicial: '2' });
    const [bajaQ, salida] = await Promise.allSettled([
      cambiarActividad(prisma, 'producto', dueno, q.id, { activo: false }),
      crearMovimiento(prisma, identidad, { productoId: q.id, tipo: 'EGRESO', motivo: 'SALIDA', cantidad: '1' }),
    ]);
    assert.equal(bajaQ.status, 'fulfilled');
    if (salida.status === 'rejected') { assert.equal(salida.reason.status, 409); assert.match(salida.reason.message, /inactivo/); }
    assert.equal(await saldo(q.id), salida.status === 'fulfilled' ? '1' : '2');
  }
});

test('API inventario: historial paginado, ordenado, con productos inactivos y sin datos de más', async () => {
  const p = await productoDePrueba('MOV-HISTORIAL', { stockInicial: '1' });
  const empleado = await identidadDe('empleado.a@example.invalid');
  for (let i = 0; i < 24; i++) await crearMovimiento(prisma, empleado, { productoId: p.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '1', observacion: `Carga ${i + 1}` });
  await cambiarActividad(prisma, 'producto', await identidadDe('dueno.a@example.invalid'), p.id, { activo: false });
  await conInventario(async api => {
    const pag1 = await api(`productos/${p.id}/movimientos`, 'GET', undefined, 'empleado');
    const pag2 = await api(`productos/${p.id}/movimientos?pagina=2`, 'GET', undefined, 'empleado');
    assert.equal(pag1.status, 200); assert.equal(pag2.status, 200);
    assert.deepEqual([pag1.body.total, pag1.body.paginas, pag1.body.items.length, pag2.body.items.length], [25, 2, 20, 5]);
    assert.equal(pag1.body.producto.activo, false); assert.equal(pag1.body.producto.stockActual, '25');
    const todos = [...pag1.body.items, ...pag2.body.items];
    assert.equal(new Set(todos.map(m => m.id)).size, 25);
    assert.equal(todos[0].observacion, 'Carga 24');
    assert.equal(todos.at(-1).motivo, 'STOCK_INICIAL');
    for (let i = 1; i < todos.length; i++) {
      const [a, b] = [todos[i - 1], todos[i]];
      assert(a.creadoEn > b.creadoEn || (a.creadoEn === b.creadoEn && a.id > b.id), 'orden por fecha descendente y desempate por id');
    }
    for (const m of todos) {
      assert.deepEqual(Object.keys(m).sort(), ['cantidad', 'creadoEn', 'id', 'motivo', 'observacion', 'tipo', 'usuario']);
      assert.deepEqual(Object.keys(m.usuario), ['nombre']);
    }
    assert(!/passwordHash|correo|usuarioId|comercioId/.test(JSON.stringify(pag1.body)));
    for (const pagina of ['0', 'abc', '1.5']) esperarError(await api(`productos/${p.id}/movimientos?pagina=${pagina}`), 400, 'VALIDATION_ERROR', /Página inválida/);
    const vacia = await api(`productos/${p.id}/movimientos?pagina=3`);
    assert.equal(vacia.status, 200); assert.deepEqual(vacia.body.items, []);
  });
});

test('inventario: cada saldo coincide con ingresos menos egresos de su historial', async () => {
  const filas = await prisma.$queryRaw`
    SELECT p.codigo, p.stock_actual::text AS saldo,
           COALESCE(SUM(CASE WHEN m.tipo = 'INGRESO' THEN m.cantidad ELSE -m.cantidad END), 0)::text AS calculado
    FROM productos p LEFT JOIN movimientos_stock m ON m.producto_id = p.id
    GROUP BY p.id, p.codigo, p.stock_actual`;
  assert(filas.length >= 15, `se esperaban los productos de las pruebas anteriores (${filas.length})`);
  for (const fila of filas) assert.equal(Number(fila.saldo), Number(fila.calculado), `${fila.codigo}: saldo ${fila.saldo}, movimientos ${fila.calculado}`);
});

async function conReposicion(callback) {
  await withServer(createApp({ prisma, auth }), async url => {
    const tokens = {};
    for (const [rol, correo, clave] of [
      ['dueno', 'dueno.a@example.invalid', 'solo-test-dueno-123'],
      ['empleado', 'empleado.a@example.invalid', 'solo-test-empleado-456'],
      ['otro', 'dueno.b@example.invalid', 'solo-test-dueno-123'],
    ]) tokens[rol] = (await (await login(url, correo, clave)).json()).token;
    await callback(async (ruta, rol = 'dueno') => {
      const res = await fetch(`${url}/api/reposicion/${ruta}`, { headers: tokens[rol] ? { Authorization: `Bearer ${tokens[rol]}` } : {} });
      return { status: res.status, body: await res.json() };
    });
  });
}

test('API reposición: alertas estrictas, mínimo cero, bajas y separación de comercios para ambos roles', async () => {
  const u = await productoDePrueba('REP-BAJO', { stockInicial: '3', stockMinimo: '5', stockObjetivo: '12' });
  const igual = await productoDePrueba('REP-IGUAL', { stockInicial: '5', stockMinimo: '5', stockObjetivo: '12' });
  const cero = await productoDePrueba('REP-CERO');
  const baja = await productoDePrueba('REP-BAJA', { stockMinimo: '5', stockObjetivo: '5' });
  await cambiarActividad(prisma, 'producto', await identidadDe('dueno.a@example.invalid'), baja.id, { activo: false });
  const otro = await productoDePrueba('REP-AJENO', { stockMinimo: '5', stockObjetivo: '5' }, 'dueno.b@example.invalid');
  await conReposicion(async api => {
    for (const rol of ['dueno', 'empleado']) {
      const res = await api(`alertas?comercioId=${otro.comercioId}`, rol);
      assert.equal(res.status, 200);
      assert(res.body.items.some(p => p.id === u.id));
      for (const p of [igual, cero, baja, otro]) assert(!res.body.items.some(i => i.id === p.id));
      assert(!JSON.stringify(res.body).includes('sugerida'));
    }
    const ajenas = await api('alertas', 'otro');
    assert(ajenas.body.items.some(p => p.id === otro.id));
    assert(!ajenas.body.items.some(p => p.id === u.id));
    esperarError(await api('alertas', 'anonimo'), 401, 'AUTH_REQUIRED');
    esperarError(await api('lista', 'empleado'), 403, 'FORBIDDEN');
  });
});

test('API reposición: sugerencias exactas por proveedor, solo lectura y recálculo con saldos nuevos', async () => {
  const dueno = await identidadDe('dueno.a@example.invalid');
  const proveedor = await guardar(prisma, 'proveedor', dueno, { nombre: 'Proveedor de reposición' });
  const kg = await productoDePrueba('REP-KG', { unidad: 'KG', stockInicial: '0.1', stockMinimo: '0.2', stockObjetivo: '0.35', proveedorId: proveedor.id });
  const antes = JSON.stringify(await prisma.producto.findMany({ orderBy: { id: 'asc' } }));
  const movimientosAntes = await prisma.movimientoStock.count();
  await conReposicion(async api => {
    const res = await api('lista'); assert.equal(res.status, 200);
    assert(Number.isFinite(Date.parse(res.body.calculadaEn)));
    const grupo = res.body.grupos.find(g => g.proveedor.id === proveedor.id);
    assert.equal(grupo.proveedor.nombre, proveedor.nombre);
    assert.equal(grupo.items.length, 1); assert.equal(grupo.items[0].cantidad, '0.25');
    assert.equal(grupo.items[0].stockActual, '0.1');
    const items = res.body.grupos.flatMap(g => g.items);
    assert.equal(items.find(p => p.codigo === 'REP-BAJO').cantidad, '9');
    assert(!items.some(p => ['REP-IGUAL', 'REP-CERO', 'REP-BAJA', 'REP-AJENO'].includes(p.codigo)));
    assert.equal(JSON.stringify(await prisma.producto.findMany({ orderBy: { id: 'asc' } })), antes);
    assert.equal(await prisma.movimientoStock.count(), movimientosAntes);
    await crearMovimiento(prisma, dueno, { productoId: kg.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '0.1' });
    const nueva = await api('lista');
    assert(!nueva.body.grupos.flatMap(g => g.items).some(p => p.id === kg.id));
    assert.equal(grupo.items[0].cantidad, '0.25', 'la respuesta anterior sigue siendo una fotografía');
    assert.equal(await saldo(kg.id), '0.2');
  });
});

test('API reposición: lista vacía y permiso actualizado aunque el token siga vigente', async () => {
  const vacio = await prisma.comercio.create({ data: { nombre: 'Comercio sin catálogo' } });
  const dueno = await identidadDe('dueno.a@example.invalid');
  await conReposicion(async api => {
    try {
      await prisma.usuario.update({ where: { id: dueno.usuarioId }, data: { comercioId: vacio.id } });
      const res = await api('lista'); assert.equal(res.status, 200); assert.deepEqual(res.body.grupos, []);
      assert.deepEqual((await api('alertas')).body.items, []);
      await prisma.usuario.update({ where: { id: dueno.usuarioId }, data: { rol: 'EMPLEADO' } });
      esperarError(await api('lista'), 403, 'FORBIDDEN');
      await prisma.usuario.update({ where: { id: dueno.usuarioId }, data: { activo: false } });
      esperarError(await api('alertas'), 401, 'INVALID_SESSION');
    } finally {
      await prisma.usuario.update({ where: { id: dueno.usuarioId }, data: { comercioId: dueno.comercioId, rol: 'DUENO', activo: true } });
    }
  });
});
