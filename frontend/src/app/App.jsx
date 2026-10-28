import React, { useEffect, useState } from 'react';
import { checkHealth } from '../services/api.js';

export default function App() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let active = true;
    setStatus('loading');
    checkHealth(controller.signal).then(() => { if (active) setStatus('ok'); })
      .catch(() => { if (active) setStatus('error'); }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  return <div className="shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Stock Manager, inicio"><span className="brand-mark" aria-hidden="true">▥</span> Stock Manager</a><span className="tag">TFI · UTN</span></header>
    <main>
      <p className="eyebrow">INVENTARIO PARA TU COMERCIO</p>
      <h1>Todo empieza<br />por tener el control.</h1>
      <p className="intro">Un lugar para organizar tus productos, registrar movimientos y preparar la próxima reposición.</p>
      <section className={`connection ${status}`} aria-labelledby="connection-title">
        <div className="connection-copy" role="status" aria-live="polite">
          <span className="status-label"><span className="dot" aria-hidden="true" />ESTADO DE LA CONEXIÓN</span>
          <h2 id="connection-title">{status === 'loading' ? 'Comprobando conexión…' : status === 'ok' ? 'La conexión está lista' : 'No pudimos conectar'}</h2>
          <p>{status === 'ok' ? 'La pantalla, el servidor y la base de datos se están comunicando.' : status === 'loading' ? 'Estamos consultando el servicio.' : 'Comprobá que el servidor y la base estén encendidos y volvé a intentar.'}</p>
        </div>
        <button disabled={status === 'loading'} onClick={() => setAttempt(value => value + 1)}>{status === 'loading' ? 'Comprobando…' : 'Volver a comprobar'}<span aria-hidden="true"> ↗</span></button>
      </section>
      <section className="roadmap" aria-labelledby="roadmap-title">
        <div className="section-heading"><h2 id="roadmap-title">Lo que estamos construyendo</h2><span>Próximas etapas</span></div>
        <div className="cards">{[
          ['01', 'Catálogo', 'Productos, categorías y proveedores organizados en un solo lugar.'],
          ['02', 'Inventario', 'Entradas, salidas y un historial para seguir cada movimiento.'],
          ['03', 'Reposición', 'Faltantes a la vista y listas para compartir con tus proveedores.'],
        ].map(([number, title, description]) => <article key={number}><span className="number">{number}</span><h3>{title}</h3><p>{description}</p><span className="pending">Pendiente de implementación</span></article>)}</div>
      </section>
      <p className="stage-note">Etapa 1 · Base del proyecto. El acceso con usuarios y las funciones de inventario se incorporan en las próximas etapas.</p>
    </main>
    <footer><span>Stock Manager</span><span>Tomás Anchorena · Nazareno Romero</span></footer>
  </div>;
}
