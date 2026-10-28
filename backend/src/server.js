import { createApp } from './app.js';
import { createPrisma } from './lib/prisma.js';
import { serverConfig } from './lib/config.js';

const { host, port, origin } = serverConfig();
const prisma = createPrisma();
const server = createApp({ prisma, origin }).listen(port, host, () => {
  console.info(`Servidor disponible en http://${host}:${port}`);
});
server.on('error', async () => {
  console.error('No se pudo iniciar el servidor. Revisar HOST y PORT.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => {
      await prisma.$disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
  });
}
