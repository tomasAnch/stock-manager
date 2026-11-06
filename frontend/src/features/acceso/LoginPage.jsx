import React, { useState } from 'react';
import { login } from '../../services/api.js';

// Pantalla de acceso (CU-01). No hay registro público: las cuentas las carga el equipo.
export default function LoginPage({ aviso, onLogin }) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return; // evita doble envío
    setError('');
    setEnviando(true);
    try {
      const { token, usuario } = await login(correo, contrasena);
      onLogin(token, usuario);
    } catch (fallo) {
      setError(fallo.message);
      setContrasena('');
      setEnviando(false);
    }
  }

  return (
    <main className="login">
      <p className="eyebrow">INVENTARIO PARA TU COMERCIO</p>
      <h1>Ingresá a<br />tu comercio.</h1>
      <form className="login-card" onSubmit={enviar} noValidate>
        {aviso && <p className="notice" role="status">{aviso}</p>}
        <label htmlFor="correo">Correo</label>
        <input id="correo" type="email" autoComplete="username" required
          value={correo} onChange={event => setCorreo(event.target.value)} disabled={enviando} />
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" type="password" autoComplete="current-password" required
          value={contrasena} onChange={event => setContrasena(event.target.value)} disabled={enviando} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={enviando || !correo.trim() || !contrasena}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="hint">Las cuentas las crea el equipo del proyecto. No hay registro público.</p>
      </form>
    </main>
  );
}
