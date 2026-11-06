import express from 'express';
import { requireAuth } from '../../middlewares/autenticacion.js';
import { iniciarSesion } from './acceso.service.js';

// POST /api/auth/login  → valida credenciales y devuelve { token, usuario }.
// GET  /api/auth/sesion → devuelve el usuario de un token vigente (para recargar la página).
// Cerrar sesión no necesita ruta: el navegador borra el token (RN-15).
export function accesoRouter({ prisma, auth }) {
  const router = express.Router();
  router.post('/login', async (req, res) => {
    res.json(await iniciarSesion(prisma, req.body, auth));
  });
  router.get('/sesion', requireAuth({ prisma, auth }), (req, res) => {
    res.json({ usuario: req.auth.usuario });
  });
  return router;
}
