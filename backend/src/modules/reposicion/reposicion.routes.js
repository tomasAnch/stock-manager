import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/autenticacion.js';
import { consultarAlertas, generarLista } from './reposicion.service.js';

export function reposicionRouter(deps) {
  const router = Router();
  router.use(requireAuth(deps));
  router.get('/alertas', async (req, res) => res.json(await consultarAlertas(deps.prisma, req.auth)));
  router.get('/lista', requireRole('DUENO'), async (req, res) => res.json(await generarLista(deps.prisma, req.auth)));
  return router;
}
