import jwt from 'jsonwebtoken';
import { HttpError } from '../../lib/http-error.js';
import { isUuid } from '../../lib/validation.js';

// Se fija el algoritmo esperado: un token firmado con otro algoritmo se rechaza aunque
// use el mismo secreto. Los tokens sin firma (alg: none) también los rechaza la librería.
const ALGORITHM = 'HS256';

// El token solo identifica al usuario (sub) y su vencimiento (exp).
// El rol y el comercio NO viajan en el token: se consultan en la base en cada solicitud.
export function firmarToken(usuarioId, { secret, expiresIn }) {
  return jwt.sign({}, secret, { algorithm: ALGORITHM, subject: usuarioId, expiresIn });
}

// Devuelve el ID del usuario si la firma y el vencimiento son válidos.
export function verificarToken(token, { secret }) {
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new HttpError(401, 'SESSION_EXPIRED', 'La sesión venció. Iniciá sesión nuevamente.');
    }
    throw new HttpError(401, 'INVALID_TOKEN', 'La sesión no es válida. Iniciá sesión nuevamente.');
  }
  if (!isUuid(payload.sub)) {
    throw new HttpError(401, 'INVALID_TOKEN', 'La sesión no es válida. Iniciá sesión nuevamente.');
  }
  return payload.sub;
}
