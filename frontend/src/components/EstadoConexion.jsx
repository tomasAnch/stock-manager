import React, { useEffect, useState } from 'react';
import { checkHealth } from '../services/api.js';

const ESTADOS = {
  loading: { title: 'Comprobando conexión…', description: 'Estamos consultando el servicio.' },
  ok: { title: 'La conexión está lista', description: 'La pantalla, el servidor y la base de datos se están comunicando.' },
  error: { title: 'No pudimos conectar', description: 'Comprobá que el servidor y la base estén encendidos y volvé a intentar.' },
};

export default function EstadoConexion() {
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();
    let activo = true;
    setEstado('loading');
    checkHealth(controller.signal)
      .then(() => { if (activo) setEstado('ok'); })
      .catch(() => { if (activo) setEstado('error'); });
    return () => { activo = false; controller.abort(); };
  }, [intento]);

  const texto = ESTADOS[estado];
  const cargando = estado === 'loading';
  return (
    <section className={`connection ${estado}`} aria-labelledby="connection-title">
      <div className="connection-copy" role="status" aria-live="polite">
        <span className="status-label"><span className="dot" aria-hidden="true" />ESTADO DE LA CONEXIÓN</span>
        <h2 id="connection-title">{texto.title}</h2>
        <p>{texto.description}</p>
      </div>
      <button type="button" disabled={cargando} onClick={() => setIntento(valor => valor + 1)}>
        {cargando ? 'Comprobando…' : 'Volver a comprobar'}
      </button>
    </section>
  );
}
