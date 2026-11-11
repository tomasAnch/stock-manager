import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { cantidadValida, crearCSV, crearTexto, fechaArgentina, formatearCantidad } from './salidas.js';

export default function Reposicion({ token, usuario, onSesionInvalida }) {
  const dueno = usuario.rol === 'DUENO';
  const [alertas, setAlertas] = useState(null);
  const [lista, setLista] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const solicitud = useRef(null);
  const ultimoIntento = useRef(false);

  async function cargar(generar = false) {
    ultimoIntento.current = generar;
    solicitud.current?.abort();
    const controller = new AbortController(); solicitud.current = controller;
    setCargando(true); setError('');
    try {
      const datos = await apiRequest(`/api/reposicion/${generar ? 'lista' : 'alertas'}`, { token, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (generar) {
        setLista(datos);
        setAlertas(datos.grupos.flatMap(g => g.items.map(p => ({ ...p, proveedor: g.proveedor }))));
      } else setAlertas(datos.items);
    } catch (e) {
      if (controller.signal.aborted) return;
      if (e.status === 401) onSesionInvalida(e.message);
      else { setError(e.message); if (e.status === 403) setLista(null); }
    } finally { if (!controller.signal.aborted) setCargando(false); }
  }

  useEffect(() => { cargar(); return () => solicitud.current?.abort(); }, [token]);

  function editar(proveedorId, productoId, cambio) {
    setLista(actual => ({ ...actual, grupos: actual.grupos.map(g => g.proveedor.id === proveedorId
      ? { ...g, items: g.items.map(p => p.id === productoId ? { ...p, ...cambio } : p) } : g) }));
  }

  return <section className="reposicion" aria-labelledby="reposicion-titulo">
    <h1 id="reposicion-titulo">{dueno ? 'Alertas y reposición' : 'Alertas de stock'}</h1>
    <p>Productos activos por debajo del mínimo. Igualar el mínimo no genera una alerta.</p>
    <div className="catalogo-actions">
      <button type="button" className="secondary" disabled={cargando} onClick={() => cargar()}>Actualizar alertas</button>
      {dueno && <button type="button" disabled={cargando} onClick={() => cargar(true)}>{lista ? 'Recalcular lista' : 'Generar lista de reposición'}</button>}
    </div>
    {cargando && <p role="status">Consultando faltantes…</p>}
    {error && <div role="alert"><p>{error} {alertas !== null && 'Se conserva la consulta anterior.'}</p><button type="button" disabled={cargando} onClick={() => cargar(ultimoIntento.current)}>Reintentar</button></div>}
    <h2>Productos en alerta</h2>
    {alertas !== null && (alertas.length === 0 ? <p>No hay productos en alerta.</p> : <ul className="reposicion-alertas">
      {alertas.map(p => <li key={p.id}><strong>{p.nombre}</strong> <span>({p.codigo}) · {p.proveedor.nombre}</span><br />
        Stock: {formatearCantidad(p.stockActual, p.unidad)} / mínimo: {formatearCantidad(p.stockMinimo, p.unidad)} {p.unidad === 'KG' ? 'kg' : 'unidades'}
      </li>)}
    </ul>)}
    {dueno && lista && <section aria-labelledby="lista-titulo">
      <h2 id="lista-titulo">Lista de reposición</h2>
      <p>Calculada el <time dateTime={lista.calculadaEn}>{fechaArgentina(lista.calculadaEn)}</time>.</p>
      <p>Actualizar alertas no modifica esta lista. Recalcular, recargar o salir de la sección descarta las ediciones. Copiar o exportar no modifica el stock ni envía pedidos.</p>
      {lista.grupos.length === 0 && <p>No hay faltantes para generar una lista.</p>}
      {lista.grupos.map(g => <Grupo key={`${lista.calculadaEn}-${g.proveedor.id}`} grupo={g} calculadaEn={lista.calculadaEn} bloqueado={cargando}
        onEditar={(id, cambio) => editar(g.proveedor.id, id, cambio)} />)}
    </section>}
  </section>;
}

function Grupo({ grupo, calculadaEn, bloqueado, onEditar }) {
  const [aviso, setAviso] = useState('');
  const [manual, setManual] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const incluidos = grupo.items.filter(p => !p.omitido);
  const valido = incluidos.length > 0 && incluidos.every(p => cantidadValida(p.cantidad, p.unidad));
  const texto = valido ? crearTexto(grupo, calculadaEn) : '';
  const deshabilitado = bloqueado || copiando;
  function cambiar(id, cambio) { setAviso(''); onEditar(id, cambio); }
  async function copiar() {
    setAviso(''); setCopiando(true);
    try { await navigator.clipboard.writeText(texto); setAviso('Texto copiado.'); setManual(false); }
    catch { setManual(true); setAviso('No se pudo copiar automáticamente. Seleccioná el texto y copialo manualmente.'); }
    finally { setCopiando(false); }
  }
  function descargar() {
    let url;
    try {
      const blob = new Blob([crearCSV(grupo, calculadaEn)], { type: 'text/csv;charset=utf-8' });
      url = URL.createObjectURL(blob);
      const enlace = document.createElement('a'); enlace.href = url;
      enlace.download = `reposicion-${grupo.proveedor.id}-${calculadaEn.slice(0, 10)}.csv`;
      document.body.append(enlace);
      try { enlace.click(); } finally { enlace.remove(); }
      setAviso('Descarga solicitada. Revisá las descargas del navegador.');
    } catch { setAviso('No se pudo preparar la descarga. Tu lista se conserva; podés reintentar o copiar el texto.'); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  return <article className="reposicion-grupo" aria-label={`Reposición para ${grupo.proveedor.nombre}`}>
    <h3>{grupo.proveedor.nombre}</h3>
    <fieldset disabled={deshabilitado}>
      <legend>Productos incluidos para {grupo.proveedor.nombre}</legend>
      {grupo.items.map(p => {
        const invalida = !p.omitido && !cantidadValida(p.cantidad, p.unidad);
        return <div className="reposicion-item" key={p.id}>
          <label className="reposicion-incluir"><input type="checkbox" checked={!p.omitido} onChange={e => cambiar(p.id, { omitido: !e.target.checked })} />Incluir {p.nombre} ({p.codigo})</label>
          <span>{p.codigo} · {p.unidad === 'KG' ? 'kg' : 'unidades'}</span>
          <label>Cantidad para {p.nombre} ({p.codigo})
            <input type="text" inputMode={p.unidad === 'KG' ? 'decimal' : 'numeric'} value={p.cantidad} disabled={p.omitido}
              maxLength={13} aria-invalid={invalida} aria-describedby={invalida ? `error-${p.id}` : undefined}
              onChange={e => cambiar(p.id, { cantidad: e.target.value })} />
          </label>
          {invalida && <p id={`error-${p.id}`} className="reposicion-error">Ingresá {p.unidad === 'KG' ? 'una cantidad positiva con hasta 3 decimales' : 'un entero positivo'}, con hasta 9 cifras enteras.</p>}
        </div>;
      })}
    </fieldset>
    {incluidos.length === 0 && <p>No quedan productos incluidos para este proveedor.</p>}
    <div className="catalogo-actions">
      <button type="button" disabled={!valido || deshabilitado} onClick={copiar}>Copiar texto de {grupo.proveedor.nombre}</button>
      <button type="button" className="secondary" disabled={!valido || deshabilitado} onClick={descargar}>Descargar CSV de {grupo.proveedor.nombre}</button>
    </div>
    {aviso && <p role="status">{aviso}</p>}
    {manual && valido && <>
      <label htmlFor={`texto-${grupo.proveedor.id}`}>Texto para copiar de {grupo.proveedor.nombre}</label>
      <textarea id={`texto-${grupo.proveedor.id}`} readOnly rows={8} value={texto} onFocus={e => e.target.select()} />
    </>}
  </article>;
}
