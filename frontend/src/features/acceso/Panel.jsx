import React, { useEffect, useState } from 'react';
import { obtenerSesion } from '../../services/api.js';
import { NOMBRE_ROL, seccionesDelRol } from './secciones.js';
import EstadoConexion from '../../components/EstadoConexion.jsx';

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
    <>
      <div className="session-bar">
        <p>
          <strong>{usuario.nombre}</strong>
          <span className="role-tag">{NOMBRE_ROL[usuario.rol] ?? usuario.rol}</span>
          <span className="store">{usuario.comercio.nombre}</span>
        </p>
        <button type="button" className="secondary" onClick={() => onCerrarSesion()}>Cerrar sesión</button>
      </div>
      <nav className="sections" aria-label="Secciones">
        {secciones.map(item => (
          <button key={item.id} type="button" aria-current={item.id === seccion.id ? 'page' : undefined}
            onClick={() => setSeccionId(item.id)}>
            {item.titulo}
          </button>
        ))}
      </nav>
      <main>
        {avisoConexion && (
          <div className="connection-notice" role="alert">
            <p>{avisoConexion}</p>
            <button type="button" className="secondary" onClick={() => setReintento(valor => valor + 1)}>Reintentar</button>
          </div>
        )}
        {seccion.id === 'inicio'
          ? <Inicio usuario={usuario} secciones={secciones.slice(1)} onAbrir={setSeccionId} />
          : <SeccionPendiente seccion={seccion} />}
      </main>
    </>
  );
}

function Inicio({ usuario, secciones, onAbrir }) {
  return (
    <>
      <p className="eyebrow">{usuario.comercio.nombre.toUpperCase()}</p>
      <h1>Hola, {usuario.nombre}.</h1>
      <p className="intro">
        Ingresaste como {NOMBRE_ROL[usuario.rol]?.toLowerCase()}. Estas son las secciones disponibles para tu rol.
      </p>
      <EstadoConexion />
      <div className="cards">
        {secciones.map(item => (
          <article key={item.id}>
            <span className="number">ETAPA {item.etapa}</span>
            <h3>{item.titulo}</h3>
            <p>{item.descripcion}</p>
            <button type="button" className="link" onClick={() => onAbrir(item.id)}>Ver sección</button>
          </article>
        ))}
      </div>
    </>
  );
}

function SeccionPendiente({ seccion }) {
  return (
    <section className="pending-section" aria-labelledby="pendiente-titulo">
      <h1 id="pendiente-titulo">{seccion.titulo}</h1>
      <p className="intro">{seccion.descripcion}</p>
      <p className="pending">Pendiente de implementación · etapa {seccion.etapa} de la hoja de ruta.</p>
    </section>
  );
}
