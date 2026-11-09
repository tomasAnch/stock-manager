import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/autenticacion.js';
import { entidades, listar, guardar, cambiarActividad } from './catalogo.service.js';

export function catalogoRouter(deps) {
  const router = Router();
  router.use(requireAuth(deps));
  for (const [ruta, modelo] of Object.entries(entidades)) {
    router.get(`/${ruta}`, async (req, res) => res.json(await listar(deps.prisma, modelo, req.auth, req.query)));
    router.post(`/${ruta}`, requireRole('DUENO'), async (req, res) => res.status(201).json(await guardar(deps.prisma, modelo, req.auth, req.body)));
    router.put(`/${ruta}/:id`, requireRole('DUENO'), async (req, res) => res.json(await guardar(deps.prisma, modelo, req.auth, req.body, req.params.id)));
    router.patch(`/${ruta}/:id/actividad`, requireRole('DUENO'), async (req, res) => res.json(await cambiarActividad(deps.prisma, modelo, req.auth, req.params.id, req.body)));
  }
  return router;
}
