import bcrypt from 'bcryptjs';
import { createPrisma } from '../src/lib/prisma.js';
import { safeErrorDetails } from '../src/lib/error-details.js';

const url = process.env.DEMO_DATABASE_URL;
const cuentas = [
  { nombre: 'Dueño de demo', correo: 'dueno@demo.example.invalid', rol: 'DUENO', clave: process.env.DEMO_OWNER_PASSWORD },
  { nombre: 'Empleado de demo', correo: 'empleado@demo.example.invalid', rol: 'EMPLEADO', clave: process.env.DEMO_EMPLOYEE_PASSWORD },
];

if (!url || cuentas.some(({ clave }) => !clave || clave.length < 16 || Buffer.byteLength(clave, 'utf8') > 72)
  || cuentas[0].clave === cuentas[1].clave) {
  console.error('Indicá DEMO_DATABASE_URL y dos contraseñas distintas de al menos 16 caracteres y hasta 72 bytes.');
  process.exitCode = 1;
} else {
  let db;
  try {
    db = createPrisma(url);
    const usuarios = await Promise.all(cuentas.map(async ({ clave, ...cuenta }) => ({
      ...cuenta,
      passwordHash: await bcrypt.hash(clave, 12),
    })));
    const creada = await db.$transaction(async tx => {
      if (await tx.comercio.count()) return false;
      await tx.comercio.create({
        data: {
          nombre: 'Comercio de demo',
          usuarios: { create: usuarios },
          categorias: { create: { nombre: 'Alimentos', nombreNormalizado: 'alimentos' } },
          proveedores: { create: { nombre: 'Proveedor de demo', nombreNormalizado: 'proveedor de demo' } },
        },
      });
      return true;
    }, { isolationLevel: 'Serializable' });
    if (creada) {
      console.info('Demo inicial creada. Usuarios: dueno@demo.example.invalid y empleado@demo.example.invalid.');
    } else {
      console.error('La base ya tiene comercios. La carga inicial requiere una base vacía de datos de negocio.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('No se pudo completar la carga inicial de la demo.', safeErrorDetails(error));
    process.exitCode = 1;
  } finally {
    await db?.$disconnect();
  }
}
