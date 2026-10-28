import { Prisma } from '../generated/prisma/client.ts';

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

export function normalizeName(input) {
  if (typeof input !== 'string') throw new ValidationError('El nombre debe ser texto.');
  const nombre = input.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!nombre || [...nombre].length > 120) throw new ValidationError('El nombre debe tener entre 1 y 120 caracteres.');
  const nombreNormalizado = nombre.toLowerCase();
  if ([...nombreNormalizado].length > 120) throw new ValidationError('El nombre normalizado supera 120 caracteres.');
  return { nombre, nombreNormalizado };
}

// Contrato API: cadena decimal con punto, sin notación científica ni redondeos.
export function parseQuantity(value, unit, { allowZero = false } = {}) {
  if (!['UNIDAD', 'KG'].includes(unit)) throw new ValidationError('Unidad inválida.');
  if (typeof value !== 'string' || value.length > 13 || !/^\d{1,9}(\.\d{1,3})?$/.test(value)) {
    throw new ValidationError('La cantidad debe ser una cadena decimal con hasta 9 enteros y 3 decimales.');
  }
  const amount = new Prisma.Decimal(value);
  if ((!allowZero && amount.isZero()) || (unit === 'UNIDAD' && !amount.isInteger())) {
    throw new ValidationError('Cantidad inválida para la unidad.');
  }
  return amount;
}
