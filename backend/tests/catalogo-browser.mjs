// Ejecutar desde raíz. Usa TEST_DATABASE_URL exclusiva y vacía; PLAYWRIGHT_MODULE opcional.

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { createApp } from '../src/app.js';
import { createPrisma } from '../src/lib/prisma.js';
import { seedDemo } from '../prisma/seed-data.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { requireTestDatabase } = await import('./test-database.js');
const db=createPrisma(requireTestDatabase());
const models=['movimientoStock','producto','usuario','categoria','proveedor','comercio'];
let api,vite,browser,clean=false;
try{
for(const m of models)assert.equal(await db[m].count(),0);clean=true;
await seedDemo(db,{ownerPassword:'review-owner-only-123',employeePassword:'review-employee-only-456'});
api=createApp({prisma:db,auth:{secret:'review-only-secret-not-for-deployment-123456',expiresIn:'8h'}}).listen(0,'127.0.0.1');await once(api,'listening');
vite=await createServer({configFile:false,root:process.cwd()+'/frontend',server:{host:'127.0.0.1',port:55436,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:'+api.address().port,changeOrigin:true}}}});await vite.listen();
browser=await chromium.launch({...(process.env.BROWSER_CHANNEL === 'chromium' ? {} : {channel:process.env.BROWSER_CHANNEL || 'msedge'}),headless:true});const p=await browser.newPage();p.setDefaultTimeout(10000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:55436');
const button=n=>p.getByRole('button',{name:n,exact:true}),field=n=>p.getByLabel(n,{exact:true});
const login=async(email,password)=>{await field('Correo').fill(email);await field('Contraseña').fill(password);await button('Ingresar').click();await button('Catálogo').click();await p.waitForLoadState('networkidle');};
await login('dueno.a@example.invalid','review-owner-only-123');await button('Crear nuevo').click();
await field('Nombre').fill('Harina integral');await field('Código').fill(' har001 ');await field('Unidad').selectOption('KG');
const categoria=await db.categoria.findFirst({where:{comercioId:'10000000-0000-4000-8000-000000000001'}});
const proveedor=await db.proveedor.findFirst({where:{comercioId:categoria.comercioId}});
await field('Categoría').selectOption(categoria.id);await field('Proveedor').selectOption(proveedor.id);
await field('Stock inicial').fill('0,250');await field('Stock mínimo').fill('2');await field('Stock objetivo').fill('5');
await button('Guardar').click();await p.getByRole('heading',{name:'Harina integral',exact:true}).waitFor();
const producto=await db.producto.findFirstOrThrow({where:{codigo:'HAR001'}});assert.equal(producto.stockActual.toString(),'0.25');assert.equal(await db.movimientoStock.count({where:{productoId:producto.id}}),1);console.log('OK alta desde UI: codigo normalizado, coma decimal y movimiento inicial real.');
await button('Editar Harina integral').click();await field('Unidad').selectOption('UNIDAD');await button('Guardar').click();await p.getByRole('alert').waitFor();assert.match(await p.getByRole('alert').innerText(),/unidad/);await button('Cancelar').click();console.log('OK unidad con historial rechazada en pantalla.');
await button('Desactivar Harina integral').click();await p.getByText('No hay registros con esos filtros.').waitFor();await field('Estado').selectOption('inactivos');await button('Reactivar Harina integral').click();await p.getByText('No hay registros con esos filtros.').waitFor();console.log('OK baja y reactivacion.');
await button('Categorías').click();await field('Estado').selectOption('activos');await button('Crear nuevo').click();await field('Nombre').fill(' Secos   varios ');await button('Guardar').click();await p.getByRole('heading',{name:'Secos varios',exact:true}).waitFor();console.log('OK alta de categoria normalizada.');
await button('Proveedores').click();await button('Crear nuevo').click();await field('Nombre').fill('Proveedor nuevo');await button('Guardar').click();await p.getByRole('heading',{name:'Proveedor nuevo',exact:true}).waitFor();
await button('Productos').click();await p.getByRole('heading',{name:'Harina integral',exact:true}).waitFor();
console.log('OK recorrido categoria -> proveedor -> producto, sin recargar.');

async function comprobarPestanas(rol) {
 await p.route('**/api/catalogo/**', async route => {
   if(route.request().method()==='GET') await new Promise(r=>setTimeout(r,150));
   await route.continue();
 });
 for(const nombre of ['Categorías','Proveedores']){
  await button(nombre).click(); await p.locator('.catalogo-grid article').first().waitFor();
  await button('Productos').click(); await p.getByRole('heading',{name:'Harina integral',exact:true}).waitFor();
 }
 await field('Buscar por código o nombre').fill('sin-coincidencias');
 await button('Buscar').click();await p.getByText('No hay registros con esos filtros.').waitFor();
 await button('Categorías').click();await p.getByRole('heading',{name:'Secos varios',exact:true}).waitFor();
 assert.equal(await field('Buscar por nombre').inputValue(),'');
 await button('Productos').click();await button('Proveedores').click();await button('Productos').click();
 await p.getByRole('heading',{name:'Harina integral',exact:true}).waitFor();
 await button('Productos').click();assert.equal(await p.getByRole('heading',{name:'Harina integral',exact:true}).count(),1);
 await p.unroute('**/api/catalogo/**');
 assert.deepEqual(errors,[]);
 console.log('OK '+rol+': regreso desde ambas pestanas con datos, respuestas demoradas, busqueda reiniciada y cambios rapidos.');
}

await comprobarPestanas('dueno');
await button('Cerrar sesión').click();await login('empleado.a@example.invalid','review-employee-only-456');await p.getByRole('heading',{name:'Harina integral',exact:true}).waitFor();assert.equal(await button('Crear nuevo').count(),0);assert.equal(await button('Editar Harina integral').count(),0);
await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await comprobarPestanas('empleado');assert.deepEqual(errors,[]);console.log('OK empleado consulta, sin escrituras; movil sin desborde; sin excepciones JS.');
}finally{await browser?.close();await vite?.close();if(api)await new Promise(r=>api.close(r));if(clean)for(const m of models)await db[m].deleteMany();await db.$disconnect();}

