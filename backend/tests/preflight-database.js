import { createPrisma } from '../src/lib/prisma.js';

const businessTables = ['comercios', 'usuarios', 'categorias', 'proveedores', 'productos', 'movimientos_stock'];
const allowedTables = new Set([...businessTables, '_prisma_migrations']);

export class PreflightError extends Error {}

export async function assertEmptyTestDatabase(prisma) {
  const relations = await prisma.$queryRaw`
    SELECT n.nspname::text AS schema, c.relname::text AS name, c.relkind::text AS kind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND n.nspname <> 'information_schema' AND n.nspname !~ '^pg_'
  `;
  for (const relation of relations) {
    if (relation.schema !== 'public' || !allowedTables.has(relation.name) || !['r', 'p'].includes(relation.kind)) {
      throw new PreflightError('La base de pruebas contiene objetos ajenos al proyecto. No se ejecutaron migraciones.');
    }
  }
  const existing = new Set(relations.map(relation => relation.name));
  for (const table of businessTables) {
    if (!existing.has(table)) continue;
    // El identificador proviene exclusivamente de la lista fija businessTables.
    const [row] = await prisma.$queryRawUnsafe(`SELECT EXISTS (SELECT 1 FROM "public"."${table}" LIMIT 1) AS occupied`);
    if (row.occupied) {
      throw new PreflightError('La base de pruebas contiene datos. No se ejecutaron migraciones; consultar la recuperación en el README.');
    }
  }
}

export async function preflightDatabase(url) {
  const prisma = createPrisma(url);
  try { await assertEmptyTestDatabase(prisma); }
  finally { await prisma.$disconnect(); }
}
