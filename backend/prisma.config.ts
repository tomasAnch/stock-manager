import { defineConfig } from 'prisma/config';
import './src/lib/load-env.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.js' },
  // generate no requiere conexión; migrate sí exige DATABASE_URL configurada.
  datasource: { url: process.env.DATABASE_URL },
});
