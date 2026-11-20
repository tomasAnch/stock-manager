import React, { useEffect, useState } from 'react';
import { obtenerSesion } from '../../services/api.js';
import { NOMBRE_ROL, seccionesDelRol } from './secciones.js';
import EstadoConexion from '../../components/EstadoConexion.jsx';
import Marca from '../../components/Marca.jsx';
import Catalogo from '../catalogo/Catalogo.jsx';
import Inventario from '../inventario/Inventario.jsx';
import Reposicion from '../reposicion/Reposicion.jsx';

function IconoSeccion({ seccion }) {
  return <span className="section-icon" data-icon={seccion === 'reposicion' ? 'alertas' : seccion} aria-hidden="true" />;
}

// Interfaz después del login: datos de la sesión, menú según el rol y contenido.
export default function Panel({ token, usuario, onUsuario, onSesionInvalida, onCerrarSesion }) {
  const secciones = seccionesDelRol(usuario.rol);
  const [seccionId, setSeccionId] = useState('inicio');
  const seccion = secciones.find(item => item.id === seccionId) ?? secciones[0];
  const [reintento, setReintento] = useState(0);
  const [avisoConexion, setAvisoConexion] = useState('');

  // Al cambiar de sección se vuelve a consultar la sesión. Si el usuario fue
  // desactivado o el token venció, el backend responde 401 y se vuelve al login.
  // Si cambió su rol en la base, el menú se actualiza con el dato del servidor.
  // Si el servidor no responde, se avisa y se ofrece reintentar sin cerrar la sesión.
  useEffect(() => {
    const controller = new AbortController();
    obtenerSesion(token, controller.signal)
      .then(data => { setAvisoConexion(''); onUsuario(data.usuario); })
      .catch(error => {
        if (controller.signal.aborted) return; // se cambió de sección antes de la respuesta
        if (error.status === 401) onSesionInvalida(error.message);
        else setAvisoConexion(error.message);
      });
    return () => controller.abort();
  }, [seccionId, token, reintento]);

  return (
    <div className="workspace">
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside className="sidebar">
        <Marca />
        <nav className="sections" aria-label="Secciones">
          {secciones.map(item => (
            <button key={item.id} type="button" aria-current={item.id === seccion.id ? 'page' : undefined}
              onClick={() => setSeccionId(item.id)}>
              <IconoSeccion seccion={item.id} />
              <span>{item.titulo}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <div className="account-initial" aria-hidden="true">{usuario.nombre.trim().charAt(0).toUpperCase()}</div>
          <div className="account-copy">
            <strong>{usuario.nombre}</strong>
            <span>{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</span>
          </div>
        </div>
        <button type="button" className="secondary signout" onClick={() => onCerrarSesion()}>Cerrar sesión</button>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <span>{usuario.comercio.nombre}</span>
          <span className="workspace-path" aria-hidden="true">/</span>
          <strong>{seccion.titulo}</strong>
        </header>
        <main id="contenido" className="workspace-main" tabIndex={-1}>
          {avisoConexion && (
            <div className="connection-notice" role="alert">
              <p>{avisoConexion}</p>
              <button type="button" className="secondary" onClick={() => setReintento(valor => valor + 1)}>Reintentar</button>
            </div>
          )}
          {seccion.id === 'inicio' && <Inicio usuario={usuario} secciones={secciones.slice(1)} onAbrir={setSeccionId} />}
          {seccion.id === 'catalogo' && <Catalogo token={token} usuario={usuario} onSesionInvalida={onSesionInvalida} />}
          {seccion.id === 'inventario' && <Inventario token={token} usuario={usuario} onSesionInvalida={onSesionInvalida} />}
          {['reposicion', 'alertas'].includes(seccion.id) && (
            <Reposicion key={`${usuario.id}-${usuario.rol}`} token={token} usuario={usuario} onSesionInvalida={onSesionInvalida} />
          )}
        </main>
        <footer className="app-footer">
          <span>TFI · UTN</span>
          <span>Tomás Anchorena · Nazareno Romero</span>
        </footer>
      </div>
    </div>
  );
}

function Inicio({ usuario, secciones, onAbrir }) {
  return (
    <>
      <div className="home-heading">
        <h1>Hola, {usuario.nombre}.</h1>
        <p className="intro">Consultá el stock y gestioná los movimientos de tu comercio.</p>
      </div>
      <div className="home-cards">
        {secciones.map(item => (
          <button key={item.id} type="button" className="module-card" data-module={item.id} onClick={() => onAbrir(item.id)}>
            <span className="module-card-top">
              <span className="module-icon"><IconoSeccion seccion={item.id} /></span>
              <span className="module-arrow" aria-hidden="true">↗</span>
            </span>
            <strong>{item.titulo}</strong>
            <span>{item.descripcion}</span>
          </button>
        ))}
      </div>
      <EstadoConexion />
    </>
  );
}
