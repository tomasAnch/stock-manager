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
  await assert.rejects(guardar(prisma, 'producto', { ...identidad, usuarioId: '00000000-0000-4000-8000-000000000000' }, { ...datos, codigo: 'ROLLBACK' }));
  assert.equal(await prisma.producto.count({ where: { codigo: 'ROLLBACK' } }), 0);
  for (const cambios of [{ stockInicial: '0.5' }, { stockObjetivo: '1' }, { stockActual: '999' }, { codigo: 'CON ESPACIO' }, { stockInicial: '0.0001', unidad: 'KG' }]) await assert.rejects(guardar(prisma, 'producto', identidad, { ...datos, ...cambios }));
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
    assert.equal((await request('productos?pagina=0')).status, 400);
    assert.equal((await request('productos?q=INI001')).status, 200);
  });
});
