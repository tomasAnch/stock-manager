import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { databaseUrl } from './config.js';

export function createPrisma(url = databaseUrl()) {
  const adapter = new PrismaPg({
    connectionString: databaseUrl(url),
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
  });
  return new PrismaClient({ adapter });
}
