// Error con estado HTTP y código estable. El mensaje es seguro para mostrar al usuario:
// nunca debe incluir datos internos, de otras cuentas ni de otros comercios.
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}
