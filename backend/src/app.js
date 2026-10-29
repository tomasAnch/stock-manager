import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middlewares/error-handler.js';
import { safeErrorDetails } from './lib/error-details.js';

export function createApp({ prisma, origin = 'http://localhost:5173', logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin }));
  app.use(express.json({ limit: '32kb' }));
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  app.get('/api/health', async (_req, res) => {
    try {
      // Comprueba conexión y presencia del esquema sin devolver datos del comercio.
      await prisma.comercio.count();
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      logger.error('No se pudo comprobar la disponibilidad de la base.', safeErrorDetails(error));
      res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }));
  app.use(errorHandler(logger));
  return app;
}
