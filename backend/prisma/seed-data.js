import bcrypt from 'bcryptjs';
import { normalizeName } from '../src/lib/validation.js';
import { SeedError } from './seed-errors.js';

export const demoStores = [
  { id: '10000000-0000-4000-8000-000000000001', nombre: 'Comercio de prueba A', suffix: 'a' },
  { id: '10000000-0000-4000-8000-000000000002', nombre: 'Comercio de prueba B', suffix: 'b' },
];

export async function seedDemo(prisma, { ownerPassword, employeePassword }) {
  for (const password of [ownerPassword, employeePassword]) {
    if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new SeedError('PASSWORD');
    }
  }
  const [ownerHash, employeeHash] = await Promise.all([
    bcrypt.hash(ownerPassword, 12), bcrypt.hash(employeePassword, 12),
  ]);
  const accounts = [
    { role: 'DUENO', name: 'dueno', passwordHash: ownerHash },
    { role: 'EMPLEADO', name: 'empleado', passwordHash: employeeHash },
  ];
  await prisma.$transaction(async tx => {
    for (const store of demoStores) {
      await tx.comercio.upsert({ where: { id: store.id }, update: {}, create: { id: store.id, nombre: store.nombre } });
      for (const account of accounts) {
        const correo = `${account.name}.${store.suffix}@example.invalid`;
        const existing = await tx.usuario.findUnique({ where: { correo } });
        if (existing && (existing.comercioId !== store.id || existing.rol !== account.role)) {
          throw new SeedError('ACCOUNT_CONFLICT');
        }
        await tx.usuario.upsert({ where: { correo }, update: {}, create: {
          comercioId: store.id, nombre: `${account.name} de prueba ${store.suffix.toUpperCase()}`, correo,
          passwordHash: account.passwordHash, rol: account.role,
        } });
      }
      const category = normalizeName('Alimentos');
      await tx.categoria.upsert({
        where: { comercioId_nombreNormalizado: { comercioId: store.id, nombreNormalizado: category.nombreNormalizado } },
        update: {}, create: { comercioId: store.id, ...category },
      });
      const supplier = normalizeName('Proveedor de prueba');
      await tx.proveedor.upsert({
        where: { comercioId_nombreNormalizado: { comercioId: store.id, nombreNormalizado: supplier.nombreNormalizado } },
        update: {}, create: { comercioId: store.id, ...supplier },
      });
    }
  });
}
