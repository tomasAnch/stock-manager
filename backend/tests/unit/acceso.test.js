import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { authConfig } from '../../src/lib/config.js';
import { requireAuth, requireRole } from '../../src/middlewares/autenticacion.js';
import { errorHandler } from '../../src/middlewares/error-handler.js';
import { delComercio, buscarDelComercio } from '../../src/modules/acceso/comercio.js';

const auth = { secret: 'secreto-solo-para-pruebas-unitarias-0123456789', expiresIn: '8h' };
const COMERCIO_A = { id: '10000000-0000-4000-8000-000000000001', nombre: 'Comercio A' };
const COMERCIO_B = { id: '10000000-0000-4000-8000-000000000002', nombre: 'Comercio B' };
const hash = bcrypt.hashSync('clave-correcta-123', 4); // costo bajo solo para que la prueba sea rápida

function usuarios() {
  return [
    { id: '20000000-0000-4000-8000-000000000001', nombre: 'Dueña A', correo: 'dueno.a@example.invalid', rol: 'DUENO', activo: true, passwordHash: hash, comercio: COMERCIO_A },
    { id: '20000000-0000-4000-8000-000000000002', nombre: 'Empleado A', correo: 'empleado.a@example.invalid', rol: 'EMPLEADO', activo: true, passwordHash: hash, comercio: COMERCIO_A },
    { id: '20000000-0000-4000-8000-000000000003', nombre: 'Inactivo A', correo: 'inactivo.a@example.invalid', rol: 'DUENO', activo: false, passwordHash: hash, comercio: COMERCIO_A },
  ];
}

// Base simulada: solo implementa lo que usa el módulo de acceso.
function fakePrisma(lista = usuarios()) {
  return {
    usuario: {
      findUnique: async ({ where, select }) => {
        const encontrado = lista.find(u => (where.correo ? u.correo === where.correo : u.id === where.id));
        if (!encontrado) return null;
        const copia = { ...encontrado };
        if (!select.passwordHash) delete copia.passwordHash;
        return copia;
      },
    },
  };
}

async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const get = (url, token) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('login correcto devuelve token y datos públicos, sin el hash', async () => {
  await withServer(createApp({ prisma: fakePrisma(), auth }), async url => {
    const res = await post(`${url}/api/auth/login`, { correo: '  Dueno.A@Example.Invalid ', contrasena: 'clave-correcta-123' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(typeof body.token, 'string');
    assert.deepEqual(body.usuario, {
      id: '20000000-0000-4000-8000-000000000001', nombre: 'Dueña A', correo: 'dueno.a@example.invalid',
      rol: 'DUENO', comercio: COMERCIO_A,
    });
    assert(!JSON.stringify(body).includes('passwordHash'));
    // El token solo identifica al usuario: no lleva rol ni comercio.
    const payload = jwt.decode(body.token);
    assert.equal(payload.sub, body.usuario.id);
    assert.equal(payload.rol, undefined);
    assert.equal(payload.comercioId, undefined);
  });
});

test('contraseña incorrecta, correo inexistente y cuenta inactiva responden igual', async () => {
  await withServer(createApp({ prisma: fakePrisma(), auth }), async url => {
    const casos = [
      { correo: 'dueno.a@example.invalid', contrasena: 'otra-clave' },
      { correo: 'nadie@example.invalid', contrasena: 'clave-correcta-123' },
      { correo: 'inactivo.a@example.invalid', contrasena: 'clave-correcta-123' },
    ];
    for (const credenciales of casos) {
      const res = await post(`${url}/api/auth/login`, credenciales);
      assert.equal(res.status, 401);
      assert.deepEqual(await res.json(), { error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' } });
    }
  });
});

test('login sin datos o con tipos inválidos responde 400', async () => {
  await withServer(createApp({ prisma: fakePrisma(), auth }), async url => {
    for (const body of [{}, { correo: 'a@b.c' }, { correo: 1, contrasena: 2 }, { correo: '  ', contrasena: 'x' }]) {
      const res = await post(`${url}/api/auth/login`, body);
      assert.equal(res.status, 400);
      assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
    }
    const sinCuerpo = await fetch(`${url}/api/auth/login`, { method: 'POST' });
    assert.equal(sinCuerpo.status, 400);
  });
});

test('sesión: sin token, encabezado mal formado, otra firma, otro algoritmo, sin firma o vencido se rechazan', async () => {
  const usuarioId = '20000000-0000-4000-8000-000000000001';
  const otraFirma = jwt.sign({}, 'otro-secreto-que-no-es-el-del-servidor-000', { subject: usuarioId, expiresIn: '1h' });
  const otroAlgoritmo = jwt.sign({}, auth.secret, { algorithm: 'HS512', subject: usuarioId, expiresIn: '1h' });
  const sinFirma = jwt.sign({}, null, { algorithm: 'none', subject: usuarioId });
  const vencido = jwt.sign({ sub: usuarioId, exp: Math.floor(Date.now() / 1000) - 10 }, auth.secret);
  await withServer(createApp({ prisma: fakePrisma(), auth }), async url => {
    const casos = [
      [{}, 'AUTH_REQUIRED'],
      [{ Authorization: 'Basic abc' }, 'AUTH_REQUIRED'],
      [{ Authorization: 'Bearer' }, 'AUTH_REQUIRED'],
      [{ Authorization: 'Bearer no-es-un-token' }, 'INVALID_TOKEN'],
      [{ Authorization: `Bearer ${otraFirma}` }, 'INVALID_TOKEN'],
      [{ Authorization: `Bearer ${otroAlgoritmo}` }, 'INVALID_TOKEN'],
      [{ Authorization: `Bearer ${sinFirma}` }, 'INVALID_TOKEN'],
      [{ Authorization: `Bearer ${vencido}` }, 'SESSION_EXPIRED'],
    ];
    for (const [headers, code] of casos) {
      const res = await fetch(`${url}/api/auth/sesion`, { headers });
      assert.equal(res.status, 401, code);
      assert.equal((await res.json()).error.code, code);
    }
  });
});

test('un token vigente deja de servir si el usuario se desactiva o ya no existe', async () => {
  const lista = usuarios();
  const prisma = fakePrisma(lista);
  await withServer(createApp({ prisma, auth }), async url => {
    const { token } = await (await post(`${url}/api/auth/login`, { correo: 'empleado.a@example.invalid', contrasena: 'clave-correcta-123' })).json();
    assert.equal((await get(`${url}/api/auth/sesion`, token)).status, 200);
    lista[1].activo = false; // como hacerlo con un script administrativo
    const desactivado = await get(`${url}/api/auth/sesion`, token);
    assert.equal(desactivado.status, 401);
    assert.equal((await desactivado.json()).error.code, 'INVALID_SESSION');
    lista.splice(1, 1);
    assert.equal((await get(`${url}/api/auth/sesion`, token)).status, 401);
  });
});

test('rol y comercio salen de la base aunque el token diga otra cosa', async () => {
  // Token bien firmado con datos agregados a mano: el servidor los ignora.
  const token = jwt.sign({ rol: 'DUENO', comercioId: COMERCIO_B.id }, auth.secret, {
    subject: '20000000-0000-4000-8000-000000000002', expiresIn: '1h',
  });
  await withServer(createApp({ prisma: fakePrisma(), auth }), async url => {
    const { usuario } = await (await get(`${url}/api/auth/sesion`, token)).json();
    assert.equal(usuario.rol, 'EMPLEADO');
    assert.deepEqual(usuario.comercio, COMERCIO_A);
  });
});

test('requireRole: el empleado recibe 403 y el dueño pasa', async () => {
  const prisma = fakePrisma();
  const app = express();
  app.get('/solo-dueno', requireAuth({ prisma, auth }), requireRole('DUENO'), (req, res) => res.json({ ok: true }));
  app.use(errorHandler({ error() {} }));
  const firmar = id => jwt.sign({}, auth.secret, { subject: id, expiresIn: '1h' });
  await withServer(app, async url => {
    const empleado = await get(`${url}/solo-dueno`, firmar('20000000-0000-4000-8000-000000000002'));
    assert.equal(empleado.status, 403);
    assert.equal((await empleado.json()).error.code, 'FORBIDDEN');
    assert.equal((await get(`${url}/solo-dueno`, firmar('20000000-0000-4000-8000-000000000001'))).status, 200);
    assert.equal((await get(`${url}/solo-dueno`)).status, 401);
  });
});

test('filtro por comercio: reemplaza el comercio enviado y no consulta IDs inválidos', async () => {
  const sesion = { comercioId: COMERCIO_A.id };
  assert.deepEqual(delComercio(sesion, { activo: true, comercioId: COMERCIO_B.id }), { activo: true, comercioId: COMERCIO_A.id });

  const consultas = [];
  const modelo = { findFirst: async args => { consultas.push(args); return null; } };
  await assert.rejects(buscarDelComercio(modelo, 'no-es-uuid', sesion), error => error.status === 404);
  assert.equal(consultas.length, 0);
  await assert.rejects(buscarDelComercio(modelo, '30000000-0000-4000-8000-000000000001', sesion), error => error.status === 404);
  assert.deepEqual(consultas[0].where, { id: '30000000-0000-4000-8000-000000000001', comercioId: COMERCIO_A.id });
});

test('configuración: exige un secreto largo y un vencimiento válido, sin mostrar el secreto', () => {
  for (const env of [{}, { JWT_SECRET: 'corto' }]) {
    assert.throws(() => authConfig(env), error => /JWT_SECRET/.test(error.message) && !error.message.includes('corto'));
  }
  const secret = 'x'.repeat(32);
  assert.deepEqual(authConfig({ JWT_SECRET: secret }), { secret, expiresIn: '8h' });
  assert.equal(authConfig({ JWT_SECRET: secret, JWT_EXPIRES_IN: '30m' }).expiresIn, '30m');
  for (const value of ['0h', '8', '8d', '-1h', '1000h']) {
    assert.throws(() => authConfig({ JWT_SECRET: secret, JWT_EXPIRES_IN: value }), /JWT_EXPIRES_IN/);
  }
});

test('CORS permite el encabezado Authorization desde el frontend configurado', async () => {
  await withServer(createApp({ prisma: fakePrisma(), auth, origin: 'http://localhost:5173' }), async url => {
    const res = await fetch(`${url}/api/auth/sesion`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.match(res.headers.get('access-control-allow-headers'), /authorization/i);
  });
});
