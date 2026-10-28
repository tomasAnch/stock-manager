import bcrypt from 'bcryptjs';
import { normalizeName } from '../src/lib/validation.js';

export const demoStores = [
  { id: '10000000-0000-4000-8000-000000000001', nombre: 'Comercio de prueba A', suffix: 'a' },
  { id: '10000000-0000-4000-8000-000000000002', nombre: 'Comercio de prueba B', suffix: 'b' },
];

export async function seedDemo(prisma, { ownerPassword, employeePassword }) {
  for (const password of [ownerPassword, employeePassword]) {
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Las contraseñas del seed deben tener al menos 12 caracteres y como máximo 72 bytes.');
    }
  }
  const [ownerHash, employeeHash] = await Promise.all([
    bcrypt.hash(ownerPassword, 12), bcrypt.hash(employeePassword, 12),
  ]);
  await prisma.$transaction(async tx => {
    for (const store of demoStores) {
      await tx.comercio.upsert({ where: { id: store.id }, update: {}, create: { id: store.id, nombre: store.nombre } });
      for (const [role, name, hash] of [['DUENO', 'dueno', ownerHash], ['EMPLEADO', 'empleado', employeeHash]]) {
        const correo = `${name}.${store.suffix}@example.invalid`;
        const existing = await tx.usuario.findUnique({ where: { correo } });
        if (existing && (existing.comercioId !== store.id || existing.rol !== role)) {
          throw new Error('Una cuenta del seed ya existe con otro rol o comercio; no se modifica.');
        }
        await tx.usuario.upsert({ where: { correo }, update: {}, create: {
          comercioId: store.id, nombre: `${name} de prueba ${store.suffix.toUpperCase()}`, correo,
          passwordHash: hash, rol: role,
        } });
      }
      for (const [model, name] of [['categoria', 'Alimentos'], ['proveedor', 'Proveedor de prueba']]) {
        const normalized = normalizeName(name);
        await tx[model].upsert({
          where: { comercioId_nombreNormalizado: { comercioId: store.id, nombreNormalizado: normalized.nombreNormalizado } },
          update: {}, create: { comercioId: store.id, ...normalized },
        });
      }
    }
  });
}
