import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { databaseUrl } from './config.js';

export function createPrisma(url = databaseUrl()) {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(url),
    // El adaptador de Prisma 7 interpreta los timestamptz recibidos como UTC.
    options: '-c TimeZone=UTC',
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}
