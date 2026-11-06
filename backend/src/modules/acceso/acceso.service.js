import bcrypt from 'bcryptjs';
import { HttpError } from '../../lib/http-error.js';
import { ValidationError } from '../../lib/validation.js';
import { firmarToken } from './token.js';

// Hash de una contraseña aleatoria que nadie conoce. Se compara contra él cuando el
// correo no existe, para que la respuesta tarde lo mismo que con un correo real y no
// se pueda averiguar qué cuentas existen midiendo el tiempo.
const HASH_FICTICIO = '$2b$12$xBLbTHL8C52993F4h9Sq8eYbMgOYWQAjquELCNmauuKVjVaB59F.e';

// Un único mensaje para correo inexistente, contraseña incorrecta o cuenta inactiva (CU-01).
const CREDENCIALES_INVALIDAS = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');

// Datos del usuario que se consultan para autenticar. Nunca se devuelve passwordHash.
export const camposUsuario = {
  id: true,
  nombre: true,
  correo: true,
  rol: true,
  activo: true,
  comercio: { select: { id: true, nombre: true } },
};

export function datosPublicos(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    comercio: { id: usuario.comercio.id, nombre: usuario.comercio.nombre },
  };
}

function leerCredenciales(body) {
  const { correo, contrasena } = body ?? {};
  if (typeof correo !== 'string' || typeof contrasena !== 'string' || !correo.trim() || !contrasena) {
    throw new ValidationError('Ingresá correo y contraseña.');
  }
  if (correo.length > 254 || contrasena.length > 200) {
    throw new ValidationError('El correo o la contraseña superan el largo permitido.');
  }
  // Los correos se guardan en minúsculas (RN-02).
  return { correo: correo.trim().toLowerCase(), contrasena };
}

export async function iniciarSesion(prisma, body, authConfig) {
  const { correo, contrasena } = leerCredenciales(body);
  const usuario = await prisma.usuario.findUnique({
    where: { correo },
    select: { ...camposUsuario, passwordHash: true },
  });
  const coincide = await bcrypt.compare(contrasena, usuario?.passwordHash ?? HASH_FICTICIO);
  if (!usuario || !coincide || !usuario.activo) throw CREDENCIALES_INVALIDAS();
  return { token: firmarToken(usuario.id, authConfig), usuario: datosPublicos(usuario) };
}
