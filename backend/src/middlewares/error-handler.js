import { ValidationError } from '../lib/validation.js';
import { safeErrorDetails } from '../lib/error-details.js';

export function errorHandler(logger = console) {
  return (error, _req, res, _next) => {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(error.type === 'entity.too.large' ? 413 : 400)
        .json({ error: { code: 'INVALID_BODY', message: 'El cuerpo de la solicitud no es válido.' } });
    }
    logger.error('Error interno al procesar una solicitud.', safeErrorDetails(error));
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } });
  };
}
