// Recorrido de navegador de la etapa 4. Ejecutar desde la raíz:
//   node --import tsx backend/tests/inventario-browser.mjs
// Requiere TEST_DATABASE_URL exclusiva, vacía y migrada (stock_manager_test). Si tiene datos, se detiene.
// Playwright no es dependencia del proyecto: PLAYWRIGHT_MODULE indica una instalación externa y
// BROWSER_CHANNEL elige el navegador (msedge por omisión; chromium para el de Playwright).
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { createApp } from '../src/app.js';
import { createPrisma } from '../src/lib/prisma.js';
import { seedDemo } from '../prisma/seed-data.js';
import { guardar, cambiarActividad } from '../src/modules/catalogo/catalogo.service.js';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { requireTestDatabase } = await import('./test-database.js');
const db = createPrisma(requireTestDatabase());
const modelos = ['movimientoStock', 'producto', 'usuario', 'categoria', 'proveedor', 'comercio'];
const ok = mensaje => console.log(`OK ${mensaje}`);
let api, vite, browser, limpiar = false;

try {
  for (const m of modelos) assert.equal(await db[m].count(), 0, `La base de pruebas debe estar vacía (${m}).`);
  limpiar = true;
  await seedDemo(db, { ownerPassword: 'review-owner-only-123', employeePassword: 'review-employee-only-456' });
  const usuario = await db.usuario.findUniqueOrThrow({ where: { correo: 'dueno.a@example.invalid' } });
  const dueno = { usuarioId: usuario.id, comercioId: usuario.comercioId, rol: 'DUENO' };
  const categoria = await db.categoria.findFirstOrThrow({ where: { comercioId: dueno.comercioId } });
  const proveedor = await db.proveedor.findFirstOrThrow({ where: { comercioId: dueno.comercioId } });
  const crear = (codigo, nombre, unidad, stockInicial) => guardar(db, 'producto', dueno, { codigo, nombre, unidad, categoriaId: categoria.id, proveedorId: proveedor.id, stockMinimo: '0', stockObjetivo: '0', stockInicial });
  const yerba = await crear('YER1', 'Yerba 1 kg', 'UNIDAD', '3');
  await crear('HAR1', 'Harina suelta', 'KG', '2.5');
  // 26 productos más para que el listado tenga dos páginas: el último queda fuera de la primera.
  for (let i = 1; i <= 26; i++) await crear(`REL${String(i).padStart(2, '0')}`, `Relleno ${String(i).padStart(2, '0')}`, 'UNIDAD', '1');
  const zeta = await crear('ZET1', 'Zeta último', 'UNIDAD', '4');
  const viejo = await crear('VIE1', 'Viejo inactivo', 'UNIDAD', '6');
  await cambiarActividad(db, 'producto', dueno, viejo.id, { activo: false });

  api = createApp({ prisma: db, auth: { secret: 'review-only-secret-not-for-deployment-123456', expiresIn: '8h' } }).listen(0, '127.0.0.1');
  await once(api, 'listening');
  vite = await createServer({ configFile: false, root: `${process.cwd()}/frontend`, logLevel: 'error', server: { host: '127.0.0.1', port: 55437, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${api.address().port}`, changeOrigin: true } } } });
  await vite.listen();
  browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL === 'chromium' ? {} : { channel: process.env.BROWSER_CHANNEL || 'msedge' }), headless: true });
  const p = await browser.newPage();
  p.setDefaultTimeout(10000);
  const errores = []; p.on('pageerror', e => errores.push(e.message));
  const boton = nombre => p.getByRole('button', { name: nombre, exact: true });
  const campo = nombre => p.getByLabel(nombre, { exact: false });
  const aviso = () => p.locator('.inventario-aviso');
  const alerta = () => p.locator('.inventario-detalle [role=alert]');
  const saldoVisible = () => p.locator('.inventario-saldo strong').innerText();
  const historial = () => p.locator('.inventario-historial li').allInnerTexts();
  // Después de registrar, el historial se recarga: esperar a que el primer elemento sea el esperado.
  const primeroDelHistorial = async patron => { await p.locator('.inventario-historial li').first().filter({ hasText: patron }).waitFor(); return (await historial())[0]; };
  const posts = []; p.on('request', r => { if (r.method() === 'POST' && r.url().includes('/api/inventario/movimientos')) posts.push(r.url()); });

  async function entrar(correo, clave) {
    await p.goto('http://127.0.0.1:55437');
    await campo('Correo').fill(correo); await p.getByLabel('Contraseña', { exact: true }).fill(clave);
    await boton('Ingresar').click();
    await boton('Inventario').click();
    await p.getByRole('heading', { name: 'Inventario', exact: true }).waitFor();
  }
  async function buscarYElegir(texto, nombre) {
    await campo('Buscar por código o nombre').fill(texto); await boton('Buscar').click();
    await p.getByRole('button', { name: new RegExp(`^Seleccionar ${nombre}`) }).click();
    await p.getByRole('heading', { name: nombre, exact: true }).waitFor();
    await p.locator('.inventario-historial li').first().waitFor();
  }

  // Envío en curso (revisión de Codex, B1): la respuesta pertenece al producto enviado.
  async function envioEnCurso(responsable) {
    await campo('Buscar por código o nombre').fill(''); await boton('Buscar').click();
    await p.getByRole('button', { name: /^Seleccionar Harina suelta/ }).click();
    await p.getByRole('heading', { name: 'Harina suelta', exact: true }).waitFor();
    await p.locator('.inventario-historial li').first().waitFor();
    await campo('Operación').selectOption({ label: 'Reposición (ingreso)' });
    const antes = Number((await saldoVisible()).split(' ')[0]);
    const otro = p.getByRole('button', { name: /^Seleccionar Relleno 01/ });

    // 1. Respuesta exitosa demorada: no se puede elegir otro producto y la confirmación queda en Harina.
    await p.route('**/api/inventario/movimientos', async ruta => { await new Promise(r => setTimeout(r, 1500)); await ruta.continue(); });
    await campo('Cantidad').fill('1'); await boton('Registrar').click();
    await p.getByText('Esperá la respuesta del movimiento de Harina suelta para elegir otro producto.').waitFor();
    assert.equal(await otro.isDisabled(), true, 'el selector debe bloquearse mientras se envía');
    assert.equal(await boton('Buscar').isDisabled(), true);
    await aviso().filter({ hasText: 'Movimiento registrado en Harina suelta' }).waitFor();
    assert.equal(await p.locator('.inventario-detalle h2').innerText(), 'Harina suelta');
    assert.equal(await otro.isDisabled(), false);
    await p.unroute('**/api/inventario/movimientos');

    // 2. El servidor confirma, pero la respuesta se pierde: el aviso nombra a Harina y su historial lo muestra.
    await p.route('**/api/inventario/movimientos', async ruta => { await ruta.fetch(); await ruta.abort('failed'); });
    await campo('Cantidad').fill('1'); await boton('Registrar').click();
    await p.getByText(/No pudimos confirmar si el movimiento de Harina suelta se registró/).waitFor();
    await p.unroute('**/api/inventario/movimientos');
    assert.equal(await p.locator('.inventario-detalle h2').innerText(), 'Harina suelta');
    await p.locator('.inventario-saldo strong', { hasText: `${antes + 2} kg` }).waitFor();
    assert.match(await primeroDelHistorial(responsable), new RegExp(`\\+1 kg · Ingreso por reposición[\\s\\S]*${responsable}`));
  }

  // --- Dueño
  await entrar('dueno.a@example.invalid', 'review-owner-only-123');
  assert.deepEqual(await p.locator('.inventario-detalle select option').allInnerTexts(), []);
  await buscarYElegir('yer', 'Yerba 1 kg');
  assert.equal(await saldoVisible(), '3 unidades');
  assert.deepEqual(await campo('Operación').locator('option').allInnerTexts(), ['Reposición (ingreso)', 'Salida (egreso)', 'Ajuste: sumar stock', 'Ajuste: restar stock']);
  await campo('Operación').selectOption({ label: 'Salida (egreso)' });
  await campo('Cantidad').fill('1');
  posts.length = 0;
  await boton('Registrar').dblclick();
  await aviso().waitFor();
  assert.equal(posts.length, 1, 'doble clic: una sola solicitud');
  assert.equal(await saldoVisible(), '2 unidades');
  assert.match(await primeroDelHistorial(/Egreso por salida/), /−1 unidad · Egreso por salida/);
  ok('salida desde la pantalla: un envío, saldo e historial actualizados.');
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/inventario-dueno.png`, fullPage: true });

  await campo('Cantidad').fill('5'); await boton('Registrar').click();
  await alerta().waitFor();
  assert.match(await alerta().innerText(), /No hay stock suficiente. Saldo disponible: 2 unidades/);
  assert.equal(await campo('Cantidad').inputValue(), '5');
  await campo('Cantidad').fill('1,5'); await boton('Registrar').click();
  await p.getByText(/número entero mayor a cero/).waitFor();
  assert.equal(await campo('Cantidad').inputValue(), '1,5');
  ok('saldo insuficiente y cantidad fraccionaria en unidades: mensaje claro y datos conservados.');

  await campo('Operación').selectOption({ label: 'Ajuste: restar stock' });
  await campo('Cantidad').fill('1'); await boton('Registrar').click();
  await p.getByText(/requiere una explicación/).waitFor();
  await campo('Observación').fill('Conteo físico: había uno roto'); await boton('Registrar').click();
  await p.getByText(/Saldo actual: 1 unidad\./).waitFor();
  assert.match(await primeroDelHistorial(/Conteo físico/), /−1 unidad · Egreso por ajuste[\s\S]*Conteo físico: había uno roto/);
  ok('ajuste del dueño: exige explicación y queda en el historial.');

  await buscarYElegir('harina', 'Harina suelta');
  await campo('Operación').selectOption({ label: 'Reposición (ingreso)' });
  await campo('Cantidad').fill('0,250'); await boton('Registrar').click();
  await p.getByText(/Saldo actual: 2.75 kg/).waitFor();
  ok('kg con coma decimal: saldo exacto.');

  // Falla de red al registrar: no se reintenta y se pide revisar el historial.
  await campo('Cantidad').fill('1');
  await p.route('**/api/inventario/movimientos', ruta => ruta.abort('failed'));
  await boton('Registrar').click();
  await p.getByText(/No pudimos confirmar si el movimiento de Harina suelta se registró/).waitFor();
  await p.unroute('**/api/inventario/movimientos');
  assert.equal(await saldoVisible(), '2.75 kg');
  ok('falla de conexión: aviso de resultado incierto, sin reintento automático.');

  // Producto fuera de la primera página y búsqueda repetida.
  await campo('Buscar por código o nombre').fill(''); await boton('Buscar').click();
  await boton('Buscar').click();
  await p.getByText('Página 1 de 2').waitFor();
  await boton('Siguiente').click();
  await p.getByRole('button', { name: /^Seleccionar Zeta último/ }).click();
  await p.getByRole('heading', { name: 'Zeta último', exact: true }).waitFor();
  ok('producto de la segunda página seleccionable; buscar dos veces no deja la carga trabada.');

  // Historial demorado y cambio rápido de producto: no se muestra el historial del anterior.
  // La respuesta de Yerba llega después que la de Harina: si no se descartara, pisaría el historial nuevo.
  await p.route('**/api/inventario/productos/**', async ruta => { await new Promise(r => setTimeout(r, ruta.request().url().includes(yerba.id) ? 2000 : 300)); await ruta.continue().catch(() => {}); });
  await campo('Buscar por código o nombre').fill('yer'); await boton('Buscar').click();
  await p.getByRole('button', { name: /^Seleccionar Yerba/ }).click();
  await campo('Buscar por código o nombre').fill('harina'); await boton('Buscar').click();
  await p.getByRole('button', { name: /^Seleccionar Harina/ }).click();
  await p.waitForTimeout(2600);
  assert.equal(await p.locator('.inventario-detalle h2').innerText(), 'Harina suelta');
  const bajoHarina = await historial();
  assert(bajoHarina.length > 0 && bajoHarina.every(texto => / kg /.test(texto)), 'el historial visible debe ser el de Harina');
  assert(!bajoHarina.some(texto => /Conteo físico|Egreso por salida/.test(texto)), 'no debe quedar historial de Yerba bajo Harina');
  await p.unroute('**/api/inventario/productos/**');
  ok('respuestas demoradas y cambio rápido de producto: sin datos del producto anterior.');

  // Inactivo: solo historial.
  await campo('Buscar por código o nombre').fill(''); await boton('Buscar').click();
  await campo('Estado').selectOption('inactivos');
  await p.getByRole('button', { name: /^Seleccionar Viejo inactivo/ }).click();
  await p.getByText(/no admite movimientos/).waitFor();
  assert.equal(await boton('Registrar').count(), 0);
  assert.match(await primeroDelHistorial(/stock inicial/), /\+6 unidades · Ingreso por stock inicial/);
  ok('producto inactivo: sin formulario y con historial.');

  // Transiciones entre secciones.
  await boton('Catálogo').click(); await p.getByRole('heading', { name: 'Harina suelta', exact: true }).waitFor();
  assert.match(await p.locator('article', { hasText: 'Harina suelta' }).innerText(), /Stock actual\s*2.75/);
  await boton('Inventario').click(); await p.getByText(/Elegí un producto de la lista/).waitFor();
  await boton('Inicio').click(); await boton('Inventario').click(); await p.getByText(/Elegí un producto de la lista/).waitFor();
  ok('Inventario ↔ Catálogo ↔ Inicio sin errores; Catálogo muestra el saldo actualizado.');

  await envioEnCurso('dueno de prueba A');
  ok('envío en curso (dueño): selector bloqueado; respuesta demorada y respuesta perdida tras confirmar quedan en el producto enviado.');

  // Historial que falla (revisión de Codex, S1): error con reintento, sin mostrarlo como vacío.
  await p.route('**/api/inventario/productos/**', ruta => ruta.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } }) }));
  await p.getByRole('button', { name: /^Seleccionar Relleno 02/ }).click();
  await p.getByText(/No pudimos cargar el historial/).waitFor();
  assert.equal(await p.getByText('Este producto todavía no tiene movimientos.').count(), 0);
  await p.unroute('**/api/inventario/productos/**');
  await p.locator('.inventario-error-historial').getByRole('button', { name: 'Reintentar' }).click();
  await p.locator('.inventario-historial li').first().filter({ hasText: /stock inicial/ }).waitFor();
  ok('historial que falla: error con reintento y sin estado vacío falso.');

  // Sesión inválida durante una carga.
  await buscarYElegir('yer', 'Yerba 1 kg');
  await p.route('**/api/inventario/movimientos', ruta => ruta.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: { code: 'INVALID_SESSION', message: 'La sesión ya no es válida. Iniciá sesión nuevamente.' } }) }));
  await campo('Cantidad').fill('1'); await boton('Registrar').click();
  await p.getByText('La sesión ya no es válida. Iniciá sesión nuevamente.').waitFor();
  await p.unroute('**/api/inventario/movimientos');
  ok('sesión inválida al registrar: vuelve al login con el motivo.');

  // --- Empleado, en móvil y con teclado
  await p.setViewportSize({ width: 390, height: 844 });
  await entrar('empleado.a@example.invalid', 'review-employee-only-456');
  await campo('Buscar por código o nombre').fill('zeta'); await p.keyboard.press('Enter');
  await p.getByRole('button', { name: /^Seleccionar Zeta último/ }).focus(); await p.keyboard.press('Enter');
  await p.getByRole('heading', { name: 'Zeta último', exact: true }).waitFor();
  assert.deepEqual(await campo('Operación').locator('option').allInnerTexts(), ['Reposición (ingreso)', 'Salida (egreso)']);
  await campo('Cantidad').fill('2'); await p.keyboard.press('Enter');
  await p.getByText(/Saldo actual: 6 unidades/).waitFor();
  assert.match(await primeroDelHistorial(/empleado de prueba A/), /\+2 unidades · Ingreso por reposición[\s\S]*empleado de prueba A/);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'sin desborde horizontal a 390 px');
  ok('empleado: solo reposición y salida, carga con teclado, móvil sin desborde.');
  await envioEnCurso('empleado de prueba A');
  ok('envío en curso (empleado): mismo resultado.');
  if (process.env.CAPTURAS) await p.screenshot({ path: `${process.env.CAPTURAS}/inventario-empleado-movil.png`, fullPage: true });

  assert.deepEqual(errores, []);
  const [{ diferencias }] = await db.$queryRaw`SELECT COUNT(*)::int AS diferencias FROM (
    SELECT p.stock_actual, COALESCE(SUM(CASE WHEN m.tipo = 'INGRESO' THEN m.cantidad ELSE -m.cantidad END), 0) AS calculado
    FROM productos p LEFT JOIN movimientos_stock m ON m.producto_id = p.id GROUP BY p.id) t WHERE stock_actual <> calculado`;
  assert.equal(diferencias, 0);
  ok('sin excepciones de JavaScript; saldos conciliados con el historial.');
} finally {
  await browser?.close();
  await vite?.close();
  if (api) await new Promise(resolve => api.close(resolve));
  if (limpiar) for (const m of modelos) await db[m].deleteMany();
  await db.$disconnect();
}
