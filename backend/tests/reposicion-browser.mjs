// Desde raíz: node --import tsx backend/tests/reposicion-browser.mjs
// Base stock_manager_test exclusiva, vacía y migrada. Playwright externo mediante PLAYWRIGHT_MODULE.
// BROWSER_CHANNEL=chromium usa el navegador de Playwright; por omisión se usa Edge instalado.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { createApp } from '../src/app.js';
import { createPrisma } from '../src/lib/prisma.js';
import { seedDemo } from '../prisma/seed-data.js';
import { guardar, cambiarActividad } from '../src/modules/catalogo/catalogo.service.js';
import { crearMovimiento } from '../src/modules/inventario/movimientos.service.js';
import { requireTestDatabase } from './test-database.js';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const db = createPrisma(requireTestDatabase());
const modelos = ['movimientoStock', 'producto', 'usuario', 'categoria', 'proveedor', 'comercio'];
const ok = mensaje => console.log(`OK ${mensaje}`);
let api, vite, browser, limpiar = false;
try {
  for (const m of modelos) assert.equal(await db[m].count(), 0, `La base de pruebas debe estar vacía (${m}).`);
  limpiar = true;
  await seedDemo(db, { ownerPassword: 'review-owner-only-123', employeePassword: 'review-employee-only-456' });
  const u = await db.usuario.findUniqueOrThrow({ where: { correo: 'dueno.a@example.invalid' } });
  const dueno = { usuarioId: u.id, comercioId: u.comercioId, rol: 'DUENO' };
  const cat = await db.categoria.findFirstOrThrow({ where: { comercioId: u.comercioId } });
  const prov = await guardar(db, 'proveedor', dueno, { nombre: 'Almacén "Ñandú"; Norte' });
  const prov2 = await guardar(db, 'proveedor', dueno, { nombre: '=Otro proveedor' });
  const crear = (codigo, nombre, unidad, stockInicial, stockMinimo, stockObjetivo, proveedorId = prov.id) => guardar(db, 'producto', dueno, { codigo, nombre, unidad, stockInicial, stockMinimo, stockObjetivo, categoriaId: cat.id, proveedorId });
  const harina = await crear('001', 'Harina', 'KG', '0.1', '0.2', '0.35');
  await crear('002', 'Yerba', 'UNIDAD', '3', '5', '12');
  await crear('003', '@Té "Ñandú"; suelto', 'KG', '0', '1', '1', prov2.id);
  await crear('004', 'Igual al mínimo', 'UNIDAD', '5', '5', '12');
  await crear('005', 'Mínimo cero', 'UNIDAD', '0', '0', '0');
  const baja = await crear('006', 'Inactivo', 'UNIDAD', '0', '1', '1');
  await cambiarActividad(db, 'producto', dueno, baja.id, { activo: false });
  const foto = async () => JSON.stringify({ productos: await db.producto.findMany({ orderBy: { id: 'asc' } }), movimientos: await db.movimientoStock.findMany({ orderBy: { id: 'asc' } }) });
  const inicial = await foto();
  api = createApp({ prisma: db, auth: { secret: 'review-only-secret-not-for-deployment-123456', expiresIn: '8h' } }).listen(0, '127.0.0.1');
  await once(api, 'listening');
  vite = await createServer({ configFile: false, root: `${process.cwd()}/frontend`, logLevel: 'error', server: { host: '127.0.0.1', port: 55438, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}`, changeOrigin: true } } } });
  await vite.listen();
  browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL === 'chromium' ? {} : { channel: process.env.BROWSER_CHANNEL || 'msedge' }), headless: true });
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  p.setDefaultTimeout(10000);
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  const boton = nombre => p.getByRole('button', { name: nombre, exact: true });
  const campo = nombre => p.getByLabel(nombre, { exact: true });
  const cantidadHarina = () => campo('Cantidad para Harina (001)');
  const cantidadYerba = () => campo('Cantidad para Yerba (002)');
  const copiar = () => boton(`Copiar texto de ${prov.nombre}`);
  const csv = () => boton(`Descargar CSV de ${prov.nombre}`);
  const generar = async () => { await boton('Generar lista de reposición').click(); await cantidadHarina().waitFor(); };
  async function entrar(rol) {
    await p.goto('http://127.0.0.1:55438');
    await campo('Correo').fill(`${rol}.a@example.invalid`);
    await campo('Contraseña').fill(rol === 'dueno' ? 'review-owner-only-123' : 'review-employee-only-456');
    await boton('Ingresar').click();
    await boton(rol === 'dueno' ? 'Alertas y reposición' : 'Alertas').click();
    await p.locator('.reposicion-alertas li').first().waitFor();
  }
  await entrar('dueno');
  assert.equal(await p.locator('.reposicion-alertas li').count(), 3);
  assert(!/Igual al mínimo|Mínimo cero|Inactivo/.test(await p.locator('.reposicion-alertas').innerText()));
  // S1: solo fijamos la fecha de la primera respuesta; los productos siguen viniendo de PostgreSQL.
  await p.route('**/api/reposicion/lista', async ruta => {
    const respuesta = await ruta.fetch();
    const datos = await respuesta.json(); datos.calculadaEn = '2026-11-11T01:30:00.000Z';
    await ruta.fulfill({ response: respuesta, json: datos });
  }, { times: 1 });
  await generar();
  assert.equal(await cantidadHarina().inputValue(), '0.25'); assert.equal(await cantidadYerba().inputValue(), '9');
  assert.equal(await p.locator('.reposicion-grupo').count(), 2);
  if (process.env.CAPTURAS === '1') await p.screenshot({ path: 'docs/implementacion/etapa-5-escritorio.png', fullPage: true });
  ok('1. Alertas estrictas y sugerencias por proveedor en escritorio.');

  for (const valor of ['', '-1', '0', '1.0001', 'abc']) {
    await cantidadHarina().fill(valor); assert.equal(await csv().isDisabled(), true); assert.equal(await copiar().isDisabled(), true);
  }
  await cantidadHarina().fill('0,250');
  await cantidadYerba().fill('2.5'); assert.equal(await csv().isDisabled(), true);
  for (const valor of ['1.000', '1,000']) {
    await cantidadYerba().fill(valor); assert.equal(await csv().isDisabled(), true); assert.equal(await copiar().isDisabled(), true);
  }
  await cantidadYerba().fill('1000'); assert.equal(await csv().isEnabled(), true);
  await cantidadYerba().fill('12'); assert.equal(await csv().isEnabled(), true);
  await campo('Incluir Yerba (002)').uncheck();
  ok('2. Cantidades inválidas bloquean salidas; coma decimal y omisiones admitidas.');

  const fecha = await p.locator('.reposicion time').innerText();
  assert.equal(fecha, '2026-11-10 22:30:00-03:00');
  async function descargar(botonCSV) {
    const descarga = p.waitForEvent('download'); await botonCSV.click();
    const archivo = await descarga;
    assert(archivo.suggestedFilename().endsWith('-2026-11-10.csv'), 'el nombre usa el día argentino, no el UTC');
    return readFile(await archivo.path());
  }
  const archivo = await descargar(csv());
  assert.deepEqual([...archivo.subarray(0, 3)], [239, 187, 191]);
  assert.equal(archivo.toString('utf8'), `\uFEFFproveedor;fecha_calculo;codigo;nombre;cantidad;unidad\r\n"Almacén ""Ñandú""; Norte";${fecha};001;Harina;0,250;KG\r\n`);
  const especial = (await descargar(boton(`Descargar CSV de ${prov2.nombre}`))).toString('utf8');
  assert(especial.includes("'=Otro proveedor;")); assert(especial.includes('"\'@Té ""Ñandú""; suelto";1,000;KG'));
  ok('3. Archivos descargados reales: BOM, CRLF, columnas, omisiones, escape y fórmulas neutralizadas.');

  // La API de portapapeles se controla para no modificar el portapapeles personal del equipo.
  await p.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async texto => { window.textoCopiado = texto; } } }));
  await copiar().click(); await p.getByText('Texto copiado.', { exact: true }).waitFor();
  assert.equal(await p.evaluate(() => window.textoCopiado), `Proveedor: ${prov.nombre}\r\nFecha del cálculo: ${fecha}\r\n\r\n001 — Harina: 0,250 kg`);
  await p.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denegado'); } } }));
  await copiar().click();
  const manual = campo(`Texto para copiar de ${prov.nombre}`); await manual.waitFor();
  assert.equal(await manual.inputValue(), (await p.evaluate(() => window.textoCopiado)).replaceAll('\r\n', '\n'));
  await cantidadHarina().fill('0.5'); assert((await manual.inputValue()).includes('0,500 kg'));
  ok('4. Copia con respuesta controlada y alternativa manual ante permiso denegado; texto actualizado.');

  await p.evaluate(() => { window.crearURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('descarga no disponible'); }; });
  await csv().click(); await p.getByText(/No se pudo preparar la descarga/).waitFor();
  assert.equal(await cantidadHarina().inputValue(), '0.5');
  await p.evaluate(() => { URL.createObjectURL = window.crearURL; });
  await campo('Incluir Harina (001)').uncheck(); assert.equal(await csv().isDisabled(), true); assert.equal(await copiar().isDisabled(), true);
  await campo('Incluir Harina (001)').check(); await campo('Incluir Yerba (002)').check();
  const conAmbos = (await descargar(csv())).toString('utf8');
  assert(conAmbos.includes(';001;Harina;0,500;KG\r\n'));
  assert(conAmbos.includes(';002;Yerba;12;UNIDAD\r\n'));
  assert.equal(await foto(), inicial);
  ok('5. Fallo de descarga conserva lista; grupo vacío bloqueado; saldos e historial intactos.');

  await crearMovimiento(db, dueno, { productoId: harina.id, tipo: 'INGRESO', motivo: 'REPOSICION', cantidad: '0.1' });
  await boton('Actualizar alertas').click(); await p.locator('.reposicion-alertas li').filter({ hasText: 'Harina' }).waitFor({ state: 'detached' });
  assert.equal(await cantidadHarina().inputValue(), '0.5'); assert.equal(await cantidadYerba().inputValue(), '12');
  assert.equal(await p.locator('.reposicion time').innerText(), fecha);
  await boton('Recalcular lista').click(); await cantidadHarina().waitFor({ state: 'detached' });
  assert.equal(await cantidadYerba().inputValue(), '9');
  ok('6. Actualizar alertas conserva la fotografía editada; recalcular obtiene faltantes nuevos.');

  await cantidadYerba().fill('20'); await p.reload();
  await boton('Alertas y reposición').click(); await boton('Generar lista de reposición').click();
  await cantidadYerba().waitFor(); assert.equal(await cantidadYerba().inputValue(), '9');
  await p.setViewportSize({ width: 390, height: 844 });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (process.env.CAPTURAS === '1') await p.screenshot({ path: 'docs/implementacion/etapa-5-movil.png', fullPage: true });
  ok('7. Recarga descarta ediciones; lista utilizable sin desborde horizontal en móvil.');

  await boton('Inicio').click();
  await p.route('**/api/reposicion/alertas', ruta => ruta.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Error simulado de alertas' } }) }));
  await boton('Alertas y reposición').click(); await p.getByText(/Error simulado de alertas/).waitFor();
  assert.equal(await p.getByText('No hay productos en alerta.', { exact: true }).count(), 0);
  await p.unroute('**/api/reposicion/alertas'); await boton('Reintentar').click(); await p.locator('.reposicion-alertas li').first().waitFor();
  await p.route('**/api/reposicion/lista', ruta => ruta.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Error simulado de lista' } }) }));
  await boton('Generar lista de reposición').click(); await p.getByText(/Error simulado de lista/).waitFor();
  await p.unroute('**/api/reposicion/lista'); await boton('Reintentar').click(); await cantidadYerba().waitFor();
  ok('8. Fallas de consulta no se confunden con lista vacía; reintento repite la operación fallida.');

  await boton('Cerrar sesión').click(); await entrar('empleado');
  assert.equal(await p.locator('.reposicion-alertas li').count(), 2);
  assert.equal(await boton('Generar lista de reposición').count(), 0);
  assert.equal(await p.getByRole('button', { name: /Descargar CSV|Copiar texto/ }).count(), 0);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  ok('9. Empleado consulta alertas en móvil sin controles de reposición.');

  for (const producto of await db.producto.findMany({ where: { activo: true } })) await cambiarActividad(db, 'producto', dueno, producto.id, { activo: false });
  await boton('Actualizar alertas').click(); await p.getByText('No hay productos en alerta.', { exact: true }).waitFor();
  await boton('Cerrar sesión').click();
  await p.goto('http://127.0.0.1:55438'); await campo('Correo').fill('dueno.a@example.invalid'); await campo('Contraseña').fill('review-owner-only-123'); await boton('Ingresar').click();
  await boton('Alertas y reposición').click(); await boton('Generar lista de reposición').click(); await p.getByText('No hay faltantes para generar una lista.', { exact: true }).waitFor();
  assert.equal(await p.getByRole('button', { name: /Descargar CSV|Copiar texto/ }).count(), 0);
  assert.deepEqual(errores, []);
  ok('10. Estados vacíos para ambos roles; no se ofrecen salidas vacías ni hubo errores de JavaScript.');
} finally {
  await browser?.close(); await vite?.close();
  if (api) await new Promise(resolve => api.close(resolve));
  if (limpiar) {
    await db.$transaction(async tx => { for (const m of modelos) await tx[m].deleteMany(); });
    for (const m of modelos) assert.equal(await db[m].count(), 0);
    ok('Datos propios de prueba retirados; seis tablas de negocio vacías.');
  }
  await db.$disconnect();
}
