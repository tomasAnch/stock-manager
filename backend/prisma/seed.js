import { createPrisma } from '../src/lib/prisma.js';
import { seedDemo } from './seed-data.js';
import { requireDemoSeed, SeedError } from './seed-errors.js';
import { safeErrorDetails } from '../src/lib/error-details.js';

let prisma;
try {
  requireDemoSeed();
  prisma = createPrisma();
  await seedDemo(prisma, { ownerPassword: process.env.SEED_OWNER_PASSWORD, employeePassword: process.env.SEED_EMPLOYEE_PASSWORD });
  console.info('Seed completo: dos comercios y cuatro cuentas de prueba. No se restablecen contraseñas existentes.');
} catch (error) {
  if (error instanceof SeedError) {
    console.error(`Seed rechazado (${error.code}): ${error.message}`);
  } else {
    console.error('No se pudo completar el seed. Revisar DATABASE_URL, disponibilidad y migraciones.', safeErrorDetails(error));
  }
  process.exitCode = 1;
} finally {
  await prisma?.$disconnect();
}
