import { HttpError } from '../lib/http-error.js';
import { verificarToken } from '../modules/acceso/token.js';
import { camposUsuario, datosPublicos } from '../modules/acceso/acceso.service.js';

// Autenticación: identifica QUIÉN hace la solicitud (RF-02, RN-15).
// 1. Lee el token del encabezado Authorization: Bearer <token>.
// 2. Verifica firma y vencimiento.
// 3. Consulta al usuario en la base: debe existir y estar activo.
// 4. Deja en req.auth el rol y el comercio LEÍDOS DE LA BASE, no del token ni del body.
export function requireAuth({ prisma, auth }) {
  return async (req, _res, next) => {
    const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') ?? '');
    if (!match) throw new HttpError(401, 'AUTH_REQUIRED', 'Iniciá sesión para continuar.');

    const usuarioId = verificarToken(match[1], auth);
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: camposUsuario });
    if (!usuario || !usuario.activo) {
      throw new HttpError(401, 'INVALID_SESSION', 'La sesión ya no es válida. Iniciá sesión nuevamente.');
    }

    req.auth = {
      usuarioId: usuario.id,
      rol: usuario.rol,
      comercioId: usuario.comercio.id,
      usuario: datosPublicos(usuario),
    };
    next();
  };
}

// Autorización: decide QUÉ puede hacer. Se usa siempre después de requireAuth.
// Ejemplo: router.post('/categorias', requireAuth(deps), requireRole('DUENO'), crearCategoria)
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.rol)) {
      throw new HttpError(403, 'FORBIDDEN', 'Tu rol no tiene permiso para esta operación.');
    }
    next();
  };
}
