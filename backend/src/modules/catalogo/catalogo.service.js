import { Prisma } from '../../generated/prisma/client.ts';
import { ValidationError, normalizeName, parseQuantity, isUuid } from '../../lib/validation.js';
import { HttpError } from '../../lib/http-error.js';
import { registrarMovimiento } from '../inventario/movimientos.service.js';

export const entidades = { categorias: 'categoria', proveedores: 'proveedor', productos: 'producto' };
const tablas = { categoria: Prisma.sql`categorias`, proveedor: Prisma.sql`proveedores`, producto: Prisma.sql`productos` };
const conflicto = message => new HttpError(409, 'CONFLICT', message);
export function datosEntrada(body, permitidos) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Se espera un objeto de datos.');
  if (Object.keys(body).some(key => !permitidos.includes(key))) throw new ValidationError('La solicitud contiene campos no permitidos.');
}
export async function bloquear(tx, modelo, id, auth) {
  if (!isUuid(id)) throw new HttpError(404, 'NOT_FOUND', 'No se encontró el registro.');
  const rows = await tx.$queryRaw(Prisma.sql`SELECT id FROM ${tablas[modelo]} WHERE id = ${id}::uuid AND comercio_id = ${auth.comercioId}::uuid FOR UPDATE`);
  if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'No se encontró el registro.');
  return tx[modelo].findUniqueOrThrow({ where: { id } });
}
async function transaccion(db, trabajo) {
  try { return await db.$transaction(trabajo); }
  catch (error) {
    if (error.code === 'P2002') throw conflicto('El código o nombre ya existe en este comercio, incluso entre los inactivos.');
    if (['P2034', 'P2028'].includes(error.code)) throw conflicto('La operación no pudo confirmarse por un conflicto. Actualizá los datos antes de volver a intentar.');
    throw error;
  }
}
function texto(value, max, campo, opcional = false) {
  if (opcional && (value == null || value === '')) return null;
  if (typeof value !== 'string') throw new ValidationError(`${campo} debe ser texto.`);
  const result = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!result || [...result].length > max) throw new ValidationError(`${campo}: entre 1 y ${max} caracteres.`);
  return result;
}
function cantidadCampo(value, unidad, campo) {
  try { return parseQuantity(value, unidad, { allowZero: true }); }
  catch (error) {
    if (error instanceof ValidationError) throw new ValidationError(`${campo}: ${error.message}`);
    throw error;
  }
}
export function validarProducto(body, alta) {
  datosEntrada(body, ['codigo', 'nombre', 'unidad', 'categoriaId', 'proveedorId', 'stockMinimo', 'stockObjetivo', ...(alta ? ['stockInicial'] : [])]);
  if (typeof body.codigo !== 'string') throw new ValidationError('Ingresá un código.');
  const codigo = body.codigo.trim().toUpperCase();
  if (!codigo || [...codigo].length > 50 || /\s/u.test(codigo)) throw new ValidationError('Código inválido: hasta 50 caracteres, sin espacios internos.');
  const nombre = texto(body.nombre, 160, 'Nombre');
  for (const [campo, etiqueta] of [['categoriaId', 'categoría'], ['proveedorId', 'proveedor']]) {
    if (typeof body[campo] !== 'string' || !body[campo].trim()) throw new ValidationError(`Seleccioná ${etiqueta}.`);
  }
  const stockMinimo = cantidadCampo(body.stockMinimo, body.unidad, 'Stock mínimo');
  const stockObjetivo = cantidadCampo(body.stockObjetivo, body.unidad, 'Stock objetivo');
  if (stockObjetivo.lt(stockMinimo)) throw new ValidationError('El objetivo no puede ser menor al mínimo.');
  const stockInicial = alta ? cantidadCampo(body.stockInicial ?? '0', body.unidad, 'Stock inicial') : null;
  return { codigo, nombre, unidad: body.unidad, categoriaId: body.categoriaId, proveedorId: body.proveedorId, stockMinimo, stockObjetivo, stockInicial };
}
async function referencias(tx, data, auth) {
  const categoria = await bloquear(tx, 'categoria', data.categoriaId, auth);
  const proveedor = await bloquear(tx, 'proveedor', data.proveedorId, auth);
  if (!categoria.activo) throw conflicto('La categoría está inactiva. Reactivala o seleccioná otra activa.');
  if (!proveedor.activo) throw conflicto('El proveedor está inactivo. Reactivalo o seleccioná otro activo.');
}
const incluir = { categoria: { select: { id: true, nombre: true, activo: true } }, proveedor: { select: { id: true, nombre: true, activo: true } } };
export async function listar(db, modelo, auth, query) {
  const pagina = Number(query.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) throw new ValidationError('Página inválida.');
  const estado = query.estado ?? 'activos';
  if (!['activos', 'inactivos', 'todos'].includes(estado)) throw new ValidationError('Estado inválido.');
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.length > 160)) throw new ValidationError('Búsqueda inválida.');
  const q = (query.q ?? '').trim();
  const where = { comercioId: auth.comercioId, ...(estado === 'todos' ? {} : { activo: estado === 'activos' }), ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, ...(modelo === 'producto' ? [{ codigo: { contains: q, mode: 'insensitive' } }] : [])] } : {}) };
  const [items, total] = await Promise.all([db[modelo].findMany({ where, ...(modelo === 'producto' ? { include: incluir } : {}), orderBy: [{ nombre: 'asc' }, { id: 'asc' }], skip: (pagina - 1) * 25, take: 25 }), db[modelo].count({ where })]);
  return { items, total, pagina, paginas: Math.max(1, Math.ceil(total / 25)) };
}
export async function guardar(db, modelo, auth, body, id) {
  if (auth.rol !== 'DUENO') throw new HttpError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para esta operación.');
  if (modelo === 'producto') {
    const { stockInicial, ...data } = validarProducto(body, !id);
    return transaccion(db, async tx => {
      const anterior = id ? await bloquear(tx, modelo, id, auth) : null;
      await referencias(tx, data, auth);
      if (anterior && anterior.unidad !== data.unidad && await tx.movimientoStock.count({ where: { productoId: id } })) throw conflicto('No se puede cambiar la unidad de un producto con movimientos.');
      const producto = id ? await tx.producto.update({ where: { id }, data }) : await tx.producto.create({ data: { ...data, comercioId: auth.comercioId } });
      if (stockInicial?.gt(0)) await registrarMovimiento(tx, auth, { productoId: producto.id, tipo: 'INGRESO', motivo: 'STOCK_INICIAL', cantidad: stockInicial.toString() }, { permitirInicial: true });
      return tx.producto.findUniqueOrThrow({ where: { id: producto.id }, include: incluir });
    });
  }
  datosEntrada(body, modelo === 'proveedor' ? ['nombre', 'telefono', 'correo'] : ['nombre']);
  const data = normalizeName(body.nombre);
  if (modelo === 'proveedor') {
    data.telefono = texto(body.telefono, 40, 'Teléfono', true);
    data.correo = texto(body.correo, 254, 'Correo', true)?.toLowerCase() ?? null;
    if (data.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) throw new ValidationError('Correo de proveedor inválido.');
  }
  return transaccion(db, async tx => {
    if (id) await bloquear(tx, modelo, id, auth);
    return id ? tx[modelo].update({ where: { id }, data }) : tx[modelo].create({ data: { ...data, comercioId: auth.comercioId } });
  });
}
export async function cambiarActividad(db, modelo, auth, id, body) {
  if (auth.rol !== 'DUENO') throw new HttpError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para esta operación.');
  datosEntrada(body, ['activo']);
  if (typeof body.activo !== 'boolean') throw new ValidationError('Indicá el estado de actividad.');
  return transaccion(db, async tx => {
    const registro = await bloquear(tx, modelo, id, auth);
    if (modelo === 'producto' && body.activo) await referencias(tx, registro, auth);
    if (modelo !== 'producto' && !body.activo && await tx.producto.count({ where: { comercioId: auth.comercioId, activo: true, [modelo === 'categoria' ? 'categoriaId' : 'proveedorId']: id } })) throw conflicto('Primero reasigná o desactivá los productos activos asociados.');
    return tx[modelo].update({ where: { id }, data: { activo: body.activo } });
  });
}
