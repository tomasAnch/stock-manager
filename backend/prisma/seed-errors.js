const messages = {
  PRODUCTION: 'El seed de demostración no se ejecuta en producción.',
  NOT_ENABLED: 'Para cargar datos ficticios, habilitar ALLOW_DEMO_SEED=true en el entorno de desarrollo.',
  PASSWORD: 'Las contraseñas del seed deben tener al menos 12 caracteres y como máximo 72 bytes.',
  ACCOUNT_CONFLICT: 'Una cuenta del seed ya existe con otro rol o comercio; no se modifica.',
};

export class SeedError extends Error {
  constructor(code) {
    super(messages[code] || 'Configuración del seed inválida.');
    this.name = 'SeedError';
    this.code = code;
  }
}

export function requireDemoSeed(env = process.env) {
  if (env.NODE_ENV === 'production') throw new SeedError('PRODUCTION');
  if (env.ALLOW_DEMO_SEED !== 'true') throw new SeedError('NOT_ENABLED');
}
