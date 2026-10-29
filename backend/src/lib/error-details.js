const errorTypes = new Set([
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'PrismaClientKnownRequestError', 'PrismaClientUnknownRequestError',
  'PrismaClientInitializationError', 'PrismaClientValidationError',
  'DriverAdapterError', 'SeedError',
]);

// Nunca serializar el error completo: message, meta y cause pueden contener datos.
export function safeErrorDetails(error) {
  const details = { type: errorTypes.has(error?.name) ? error.name : 'Error' };
  const code = error?.code || error?.errorCode || error?.cause?.code;
  if (typeof code === 'string' && /^(P\d{4}|[0-9A-Z]{5}|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND)$/.test(code)) {
    details.code = code;
  }
  // Solo archivo y posición, sin mensaje, rutas completas ni nombres de funciones.
  const locations = (typeof error?.stack === 'string' ? error.stack.split('\n') : [])
    .filter(line => /^\s+at /.test(line))
    .map(line => line.match(/(?:[/\\])([a-zA-Z0-9_.-]+\.[cm]?[jt]sx?:\d+:\d+)\)?$/)?.[1])
    .filter(Boolean)
    .slice(0, 5);
  if (locations.length) details.locations = locations;
  return details;
}
