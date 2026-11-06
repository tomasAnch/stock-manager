import { HttpError } from '../../lib/http-error.js';
import { isUuid } from '../../lib/validation.js';

// Filtro por comercio (RN-01) para usar en los módulos siguientes.
// El comercio sale siempre de req.auth (usuario verificado en la base). Si el filtro
// recibido trae un comercioId, se reemplaza: el cliente nunca elige el comercio.
export function delComercio(auth, where = {}) {
  return { ...where, comercioId: auth.comercioId };
}

// Busca un registro por ID dentro del comercio autenticado. Un ID inválido, inexistente
// o de otro comercio responde igual (404), sin revelar si existe en otro lado.
// Ejemplo: await buscarDelComercio(prisma.categoria, req.params.id, req.auth)
export async function buscarDelComercio(modelo, id, auth, { select } = {}) {
  const noEncontrado = new HttpError(404, 'NOT_FOUND', 'No se encontró el registro.');
  if (!isUuid(id)) throw noEncontrado;
  const registro = await modelo.findFirst({ where: delComercio(auth, { id }), select });
  if (!registro) throw noEncontrado;
  return registro;
}
