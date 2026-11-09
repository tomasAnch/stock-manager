import { Prisma } from '../../generated/prisma/client.ts';
import { parseQuantity, isUuid, ValidationError } from '../../lib/validation.js';
import { HttpError } from '../../lib/http-error.js';

// Recibe el cliente de una transacción abierta: el alta y el movimiento se confirman juntos.
// No expone un endpoint de movimientos; la etapa 4 reutilizará esta operación.
export async function registrarMovimiento(tx, auth, data, { permitirInicial = false } = {}) {
  const { productoId, tipo, motivo } = data;
  if (!isUuid(productoId)) throw new ValidationError('Producto inválido.');
  const permitidos = { STOCK_INICIAL: ['INGRESO'], REPOSICION: ['INGRESO'], SALIDA: ['EGRESO'], AJUSTE: ['INGRESO', 'EGRESO'] };
  if (!permitidos[motivo]?.includes(tipo)) throw new ValidationError('Tipo y motivo incompatibles.');
  if ((motivo === 'STOCK_INICIAL' && (!permitirInicial || auth.rol !== 'DUENO')) || (motivo === 'AJUSTE' && auth.rol !== 'DUENO')) throw new HttpError(403, 'FORBIDDEN', 'Movimiento no permitido.');
  const observacion = data.observacion ?? null;
  if (observacion !== null && (typeof observacion !== 'string' || observacion.length > 500)) throw new ValidationError('Observación inválida.');
  if (motivo === 'AJUSTE' && !observacion?.trim()) throw new ValidationError('El ajuste requiere una explicación.');
  const rows = await tx.$queryRaw`SELECT id FROM productos WHERE id = ${productoId}::uuid AND comercio_id = ${auth.comercioId}::uuid FOR UPDATE`;
  if (!rows.length) throw new HttpError(404, 'NOT_FOUND', 'No se encontró el producto.');
  const producto = await tx.producto.findUniqueOrThrow({ where: { id: productoId } });
  if (!producto.activo) throw new HttpError(409, 'CONFLICT', 'El producto está inactivo.');
  const cantidad = parseQuantity(data.cantidad, producto.unidad);
  if (tipo === 'INGRESO' && producto.stockActual.plus(cantidad).gt(new Prisma.Decimal('999999999.999'))) throw new ValidationError('El ingreso supera el saldo máximo permitido.');
  const usuario = await tx.usuario.findFirst({ where: { id: auth.usuarioId, comercioId: auth.comercioId, activo: true } });
  if (!usuario) throw new HttpError(401, 'INVALID_SESSION', 'La sesión ya no es válida.');
  const result = await tx.producto.updateMany({ where: { id: productoId, comercioId: auth.comercioId, activo: true, ...(tipo === 'EGRESO' ? { stockActual: { gte: cantidad } } : {}) }, data: { stockActual: { [tipo === 'INGRESO' ? 'increment' : 'decrement']: cantidad } } });
  if (result.count !== 1) throw new HttpError(409, 'CONFLICT', 'No hay stock suficiente para la operación.');
  return tx.movimientoStock.create({ data: { productoId, usuarioId: auth.usuarioId, tipo, motivo, cantidad, observacion: observacion?.trim() || null } });
}
