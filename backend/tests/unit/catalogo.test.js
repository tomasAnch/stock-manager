import test from 'node:test';
import assert from 'node:assert/strict';
import { validarProducto } from '../../src/modules/catalogo/catalogo.service.js';
const base = { codigo: ' har01 ', nombre: 'Harina', unidad: 'KG', categoriaId: 'x', proveedorId: 'y', stockInicial: '0.250', stockMinimo: '2', stockObjetivo: '5' };
test('catálogo: códigos normalizados y cantidades exactas', () => { const d=validarProducto(base,true);assert.equal(d.codigo,'HAR01');assert.equal(d.stockInicial.toString(),'0.25'); });
test('catálogo: no acepta escribir saldo, comercio ni actividad por el alta', () => { for(const campo of ['stockActual','comercioId','activo']) assert.throws(()=>validarProducto({...base,[campo]:'1'},true)); });
test('catálogo: edición no admite otro stock inicial', () => { assert.throws(()=>validarProducto(base,false)); });
test('catálogo: rechaza unidad fraccionaria, precisión excesiva y objetivo menor al mínimo', () => { for(const cambio of [{unidad:'UNIDAD'},{stockInicial:'0.0001'},{stockObjetivo:'1'},{codigo:'DOS CODIGOS'}]) assert.throws(()=>validarProducto({...base,...cambio},true)); });
