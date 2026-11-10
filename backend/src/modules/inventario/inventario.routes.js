import { Router } from 'express';
import { requireAuth } from '../../middlewares/autenticacion.js';
import { crearMovimiento, historial } from './movimientos.service.js';

// Ambos roles registran reposiciones y salidas y consultan el historial. El permiso de AJUSTE
// depende del motivo enviado, por eso lo controla el servicio con el rol leído de la base.
export function inventarioRouter(deps) {
  const router = Router();
  router.use(requireAuth(deps));
  router.post('/movimientos', async (req, res) => res.status(201).json(await crearMovimiento(deps.prisma, req.auth, req.body)));
  router.get('/productos/:id/movimientos', async (req, res) => res.json(await historial(deps.prisma, req.auth, req.params.id, req.query)));
  return router;
}
