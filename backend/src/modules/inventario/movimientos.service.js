import { Prisma } from '../../generated/prisma/client.ts';
import { parseQuantity, isUuid, ValidationError } from '../../lib/validation.js';
import { HttpError } from '../../lib/http-error.js';

const SALDO_MAXIMO = new Prisma.Decimal('999999999.999');
const TIPOS_POR_MOTIVO = { STOCK_INICIAL: ['INGRESO'], REPOSICION: ['INGRESO'], SALIDA: ['EGRESO'], AJUSTE: ['INGRESO', 'EGRESO'] };
// Motivos que se pueden pedir por la API habitual. STOCK_INICIAL solo nace en el alta del producto (RN-07).
const MOTIVOS_DE_LA_API = ['REPOSICION', 'SALIDA', 'AJUSTE'];
const POR_PAGINA = 20;

const productoNoEncontrado = () => new HttpError(404, 'NOT_FOUND', 'No se encontró el producto.');
const conflicto = message => new HttpError(409, 'CONFLICT', message);

function leerCantidad(valor, unidad) {
  try { return parseQuantity(valor, unidad); }
  catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    throw new ValidationError(unidad === 'KG'
      ? 'Cantidad: ingresá un número mayor a cero, con hasta 9 enteros y 3 decimales (por ejemplo 0.250).'
      : 'Cantidad: ingresá un número entero mayor a cero, de hasta 9 dígitos (por ejemplo 2).');
  }
}

function leerObservacion(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new ValidationError('Observación: debe ser texto.');
  const texto = value.normalize('NFC').trim();
  if ([...texto].length > 500) throw new ValidationError('Observación: hasta 500 caracteres.');
  return texto || null;
}

// Recibe el cliente de una transacción abierta. Catálogo la usa para STOCK_INICIAL dentro del alta;
// crearMovimiento la usa para la API de Inventario. Es la única operación que modifica el saldo.
export async function registrarMovimiento(tx, auth, data, { permitirInicial = false } = {}) {
  const { productoId, tipo, motivo } = data;
  if (typeof productoId !== 'string' || !productoId) throw new ValidationError('Seleccioná un producto.');
  if (!TIPOS_POR_MOTIVO[motivo]?.includes(tipo)) throw new ValidationError('Tipo y motivo incompatibles.');
  if ((motivo === 'STOCK_INICIAL' && (!permitirInicial || auth.rol !== 'DUENO')) || (motivo === 'AJUSTE' && auth.rol !== 'DUENO')) {
    throw new HttpError(403, 'FORBIDDEN', 'Tu rol no puede registrar este movimiento.');
  }
  const observacion = leerObservacion(data.observacion);
  if (motivo === 'AJUSTE' && !observacion) throw new ValidationError('Observación: el ajuste requiere una explicación.');
  if (!isUuid(productoId)) throw productoNoEncontrado();

  // 1. Bloquear la fila del producto del comercio. Otro movimiento, una baja o un cambio de unidad
  //    sobre el mismo producto esperan hasta que esta transacción confirme o se revierta.
  const rows = await tx.$queryRaw`SELECT id FROM productos WHERE id = ${productoId}::uuid AND comercio_id = ${auth.comercioId}::uuid FOR UPDATE`;
  if (!rows.length) throw productoNoEncontrado();
  // 2. Con el bloqueo tomado, leer unidad, actividad y saldo vigentes.
  const producto = await tx.producto.findUniqueOrThrow({ where: { id: productoId } });
  if (!producto.activo) throw conflicto('El producto está inactivo: no admite movimientos.');
  const cantidad = leerCantidad(data.cantidad, producto.unidad);
  if (tipo === 'INGRESO' && producto.stockActual.plus(cantidad).gt(SALDO_MAXIMO)) throw new ValidationError('Cantidad: el ingreso supera el saldo máximo permitido.');
  const usuario = await tx.usuario.findFirst({ where: { id: auth.usuarioId, comercioId: auth.comercioId, activo: true } });
  if (!usuario) throw new HttpError(401, 'INVALID_SESSION', 'La sesión ya no es válida.');

  // 3. Actualizar el saldo con aritmética de PostgreSQL. El egreso exige saldo suficiente en la misma
  //    sentencia: si no alcanza, no se modifica ninguna fila.
  const result = await tx.producto.updateMany({
    where: { id: productoId, comercioId: auth.comercioId, activo: true, ...(tipo === 'EGRESO' ? { stockActual: { gte: cantidad } } : {}) },
    data: { stockActual: { [tipo === 'INGRESO' ? 'increment' : 'decrement']: cantidad } },
  });
  if (result.count !== 1) throw conflicto(`No hay stock suficiente. Saldo disponible: ${producto.stockActual} ${producto.unidad === 'KG' ? 'kg' : producto.stockActual.eq(1) ? 'unidad' : 'unidades'}.`);

  // 4. Registrar el movimiento con el mismo cliente transaccional. La fecha se toma del reloj de
  //    PostgreSQL después del bloqueo, así el orden del historial coincide con el orden de aplicación.
  const [{ ahora }] = await tx.$queryRaw`SELECT clock_timestamp() AS ahora`;
  return tx.movimientoStock.create({ data: { productoId, usuarioId: usuario.id, tipo, motivo, cantidad, observacion, creadoEn: ahora } });
}

// Valida la forma de la solicitud antes de abrir la transacción.
export function validarSolicitud(body, auth) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Se espera un objeto de datos.');
  const permitidos = ['productoId', 'tipo', 'motivo', 'cantidad', 'observacion'];
  if (Object.keys(body).some(key => !permitidos.includes(key))) throw new ValidationError('La solicitud contiene campos no permitidos.');
  if (!MOTIVOS_DE_LA_API.includes(body.motivo)) {
    throw new ValidationError(body.motivo === 'STOCK_INICIAL' ? 'El stock inicial solo se registra al crear el producto.' : 'Motivo inválido.');
  }
  if (body.motivo === 'AJUSTE' && auth.rol !== 'DUENO') throw new HttpError(403, 'FORBIDDEN', 'Solo el dueño registra ajustes.');
  if (!TIPOS_POR_MOTIVO[body.motivo].includes(body.tipo)) throw new ValidationError('Tipo y motivo incompatibles.');
  return { productoId: body.productoId, tipo: body.tipo, motivo: body.motivo, cantidad: body.cantidad, observacion: body.observacion };
}

const camposMovimiento = { id: true, tipo: true, motivo: true, cantidad: true, observacion: true, creadoEn: true, usuario: { select: { nombre: true } } };
const camposProducto = { id: true, codigo: true, nombre: true, unidad: true, stockActual: true, activo: true };

export async function crearMovimiento(db, auth, body) {
  const data = validarSolicitud(body, auth);
  try {
    // No se reintenta: si la respuesta se pierde, la interfaz indica revisar el historial antes de repetir.
    return await db.$transaction(async tx => {
      const { id } = await registrarMovimiento(tx, auth, data);
      const movimiento = await tx.movimientoStock.findUniqueOrThrow({ where: { id }, select: camposMovimiento });
      const producto = await tx.producto.findUniqueOrThrow({ where: { id: data.productoId }, select: camposProducto });
      return { movimiento, producto };
    });
  } catch (error) {
    if (['P2034', 'P2028'].includes(error.code)) throw conflicto('La operación no pudo confirmarse por un conflicto. Revisá el historial antes de volver a intentar.');
    throw error;
  }
}

export async function historial(db, auth, productoId, query) {
  const pagina = Number(query.pagina ?? 1);
  if (!Number.isSafeInteger(pagina) || pagina < 1 || pagina > 100000) throw new ValidationError('Página inválida.');
  if (!isUuid(productoId)) throw productoNoEncontrado();
  const where = { productoId, producto: { comercioId: auth.comercioId } };
  // Lectura en una sola instantánea: el saldo y la página corresponden al mismo momento.
  const [producto, items, total] = await db.$transaction([
    db.producto.findFirst({ where: { id: productoId, comercioId: auth.comercioId }, select: camposProducto }),
    db.movimientoStock.findMany({ where, select: camposMovimiento, orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    db.movimientoStock.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  if (!producto) throw productoNoEncontrado();
  return { producto, items, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
