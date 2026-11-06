import React, { useEffect, useState } from 'react';
import { obtenerSesion } from '../services/api.js';
import { borrarToken, guardarToken, leerToken } from '../features/acceso/token-guardado.js';
import LoginPage from '../features/acceso/LoginPage.jsx';
import Panel from '../features/acceso/Panel.jsx';

// Estados de la sesión:
// - verificando: hay un token guardado y se consulta al backend si sigue siendo válido.
// - anonimo: se muestra el login (con un aviso opcional, por ejemplo "la sesión venció").
// - autenticado: se muestra el panel del rol.
// - sinConexion: hay token pero el backend no respondió; se ofrece reintentar.
function estadoInicial() {
  return leerToken() ? { fase: 'verificando' } : { fase: 'anonimo' };
}

export default function App() {
  const [sesion, setSesion] = useState(estadoInicial);

  useEffect(() => {
    if (sesion.fase !== 'verificando') return undefined;
    const token = leerToken();
    const controller = new AbortController();
    obtenerSesion(token, controller.signal)
      .then(({ usuario }) => setSesion({ fase: 'autenticado', token, usuario }))
      .catch(error => {
        if (controller.signal.aborted) return;
        if (error.status === 401) cerrarSesion(error.message);
        else setSesion({ fase: 'sinConexion', mensaje: error.message });
      });
    return () => controller.abort();
  }, [sesion.fase]);

  function iniciarSesion(token, usuario) {
    guardarToken(token);
    setSesion({ fase: 'autenticado', token, usuario });
  }

  function cerrarSesion(aviso) {
    borrarToken();
    setSesion({ fase: 'anonimo', aviso });
  }

  function actualizarUsuario(usuario) {
    setSesion(actual => (actual.fase === 'autenticado' ? { ...actual, usuario } : actual));
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">▥</span> Stock Manager
        </span>
        <span className="tag">TFI · UTN</span>
      </header>

      {sesion.fase === 'anonimo' && <LoginPage aviso={sesion.aviso} onLogin={iniciarSesion} />}

      {sesion.fase === 'verificando' && (
        <main><p className="intro" role="status">Comprobando tu sesión…</p></main>
      )}

      {sesion.fase === 'sinConexion' && (
        <main>
          <p className="form-error" role="alert">{sesion.mensaje}</p>
          <div className="actions">
            <button type="button" onClick={() => setSesion({ fase: 'verificando' })}>Reintentar</button>
            <button type="button" className="secondary" onClick={() => cerrarSesion()}>Volver al login</button>
          </div>
        </main>
      )}

      {sesion.fase === 'autenticado' && (
        <Panel
          token={sesion.token}
          usuario={sesion.usuario}
          onUsuario={actualizarUsuario}
          onSesionInvalida={cerrarSesion}
          onCerrarSesion={() => cerrarSesion('Cerraste la sesión.')}
        />
      )}

      <footer>
        <span>Stock Manager</span>
        <span>Tomás Anchorena · Nazareno Romero</span>
      </footer>
    </div>
  );
}
