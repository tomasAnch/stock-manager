import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ValidationError } from './lib/validation.js';

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
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
  });

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }));
  app.use((error, _req, res, _next) => {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(error.type === 'entity.too.large' ? 413 : 400)
        .json({ error: { code: 'INVALID_BODY', message: 'El cuerpo de la solicitud no es válido.' } });
    }
    logger.error('Error interno al procesar una solicitud.');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } });
  });
  return app;
}
