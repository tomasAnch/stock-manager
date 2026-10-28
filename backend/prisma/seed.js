import { createPrisma } from '../src/lib/prisma.js';
import { seedDemo } from './seed-data.js';

if (process.env.NODE_ENV === 'production') throw new Error('El seed de demostración no se ejecuta en producción.');
const prisma = createPrisma();
try {
  await seedDemo(prisma, { ownerPassword: process.env.SEED_OWNER_PASSWORD, employeePassword: process.env.SEED_EMPLOYEE_PASSWORD });
  console.info('Seed completo: dos comercios y cuatro cuentas de prueba. No se restablecen contraseñas existentes.');
} catch {
  console.error('No se pudo completar el seed. Revisar conexión, migraciones, contraseñas y posibles cuentas en conflicto.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
