import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api.js';

const titulos = { productos: 'Productos', categorias: 'Categorías', proveedores: 'Proveedores' };
const singular = { productos: 'producto', categorias: 'categoría', proveedores: 'proveedor' };
const vacio = { nombre: '', codigo: '', unidad: 'UNIDAD', categoriaId: '', proveedorId: '', stockInicial: '0', stockMinimo: '0', stockObjetivo: '0', telefono: '', correo: '' };
export default function Catalogo({ token, usuario, onSesionInvalida }) {
  const [tipo, setTipo] = useState('productos');
  const [estado, setEstado] = useState('activos');
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [revision, setRevision] = useState(0);
  const [lista, setLista] = useState({ items: [], paginas: 1, total: 0 });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [editor, setEditor] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [refs, setRefs] = useState({ categorias: [], proveedores: [] });
  const dueno = usuario.rol === 'DUENO';
  const api = (path, options = {}) => apiRequest(`/api/catalogo/${path}`, { token, ...options });
  const fallo = e => { if (e.status === 401) onSesionInvalida(e.message); else setError(e.message); };
  useEffect(() => {
    const controller = new AbortController(); setCargando(true); setError('');
    api(`${tipo}?${new URLSearchParams({ estado, q, pagina })}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setLista(data); }).catch(e => { if (!controller.signal.aborted) fallo(e); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [tipo, estado, q, pagina, revision, token]);
  function cambiarPestana(key) {
    if (key === tipo) return;
    // React renderiza antes de ejecutar el efecto: no interpretar filas del recurso anterior.
    setLista({ items: [], paginas: 1, total: 0 }); setCargando(true);
    setTipo(key); setPagina(1); setQ(''); setBusqueda(''); setEstado('activos');
    setEditor(null); setAviso(''); setError('');
  }
  async function abrir(item) {
    setError(''); setAviso(''); setOcupado(true);
    try {
      if (tipo === 'productos') {
        // Las referencias también están paginadas: no se omiten opciones después de la primera página.
        const cargar = async recurso => {
          const items = []; let page = 1, result;
          do { result = await api(`${recurso}?estado=todos&pagina=${page++}`); items.push(...result.items); } while (page <= result.paginas);
          return items;
        };
        const [categorias, proveedores] = await Promise.all([cargar('categorias'), cargar('proveedores')]);
        setRefs({ categorias, proveedores });
      }
      setEditor({ ...vacio, ...item });
    } catch (e) { fallo(e); } finally { setOcupado(false); }
  }
  async function guardar(event) {
    event.preventDefault(); if (ocupado) return;
    setOcupado(true); setError('');
    try {
      const campos = tipo === 'productos' ? ['codigo', 'nombre', 'unidad', 'categoriaId', 'proveedorId', 'stockMinimo', 'stockObjetivo', ...(!editor.id ? ['stockInicial'] : [])] : ['nombre', ...(tipo === 'proveedores' ? ['telefono', 'correo'] : [])];
      const body = Object.fromEntries(campos.map(campo => [campo, campo.startsWith('stock') ? editor[campo].replace(',', '.') : editor[campo]]));
      await api(`${tipo}${editor.id ? `/${editor.id}` : ''}`, { method: editor.id ? 'PUT' : 'POST', body });
      setEditor(null); setAviso('Cambios guardados.'); setRevision(n => n + 1);
    } catch (e) { fallo(e); } finally { setOcupado(false); }
  }
  async function actividad(item) {
    setOcupado(true); setError(''); setAviso('');
    try { await api(`${tipo}/${item.id}/actividad`, { method: 'PATCH', body: { activo: !item.activo } }); setRevision(n => n + 1); setAviso('Estado actualizado.'); }
    catch (e) { fallo(e); } finally { setOcupado(false); }
  }
  function campo(name, label, options = {}) {
    return <label key={name}>{label}<input name={name} value={editor[name] ?? ''} onChange={e => setEditor({ ...editor, [name]: e.target.value })} {...options} /></label>;
  }
  return <section className="catalogo">
    <h1>Catálogo</h1><p>Productos, existencias y datos de reposición de tu comercio.</p>
    <div className="catalogo-actions">{Object.entries(titulos).map(([key, label]) => <button disabled={ocupado} key={key} aria-pressed={tipo === key} className={tipo === key ? '' : 'secondary'} onClick={() => cambiarPestana(key)}>{label}</button>)}</div>
    {error && <p role="alert" className="form-error">{error}</p>}{aviso && <p role="status">{aviso}</p>}
    {editor && dueno ? <form className="catalogo-form" onSubmit={guardar}>
      <h2>{editor.id ? 'Editar' : 'Crear'} {singular[tipo]}</h2>
      <fieldset disabled={ocupado}>
        {campo('nombre', 'Nombre', { required: true, maxLength: tipo === 'productos' ? 160 : 120 })}
        {tipo === 'productos' && <>
          {campo('codigo', 'Código', { required: true, maxLength: 50 })}
          <label htmlFor="catalogo-unidad">Unidad<select id="catalogo-unidad" aria-label="Unidad" value={editor.unidad} onChange={e => setEditor({ ...editor, unidad: e.target.value })}><option value="UNIDAD">Unidad</option><option value="KG">Kilogramo</option></select></label>
          {['categorias', 'proveedores'].map(key => { const field = key === 'categorias' ? 'categoriaId' : 'proveedorId'; return <label key={key}>{key === 'categorias' ? 'Categoría' : 'Proveedor'}<select aria-label={key === 'categorias' ? 'Categoría' : 'Proveedor'} required value={editor[field]} onChange={e => setEditor({ ...editor, [field]: e.target.value })}><option value="">Seleccionar…</option>{refs[key].map(ref => <option key={ref.id} value={ref.id} disabled={!ref.activo}>{ref.nombre}{!ref.activo ? ' (inactivo: reasignar)' : ''}</option>)}</select></label>; })}
          {!editor.id && campo('stockInicial', 'Stock inicial', { required: true, inputMode: 'decimal' })}
          {campo('stockMinimo', 'Stock mínimo', { required: true, inputMode: 'decimal' })}{campo('stockObjetivo', 'Stock objetivo', { required: true, inputMode: 'decimal' })}
          <p>Las cantidades admiten coma o punto. El saldo se modifica con movimientos; la unidad no puede cambiar si ya hay historial.</p>
        </>}
        {tipo === 'proveedores' && <>{campo('telefono', 'Teléfono', { maxLength: 40 })}{campo('correo', 'Correo del proveedor', { type: 'email', maxLength: 254 })}</>}
        <div className="catalogo-actions"><button type="submit">{ocupado ? 'Guardando…' : 'Guardar'}</button><button type="button" className="secondary" onClick={() => setEditor(null)}>Cancelar</button></div>
      </fieldset>
    </form> : <>
      <form className="catalogo-actions" onSubmit={e => { e.preventDefault(); setQ(busqueda); setPagina(1); setRevision(n => n + 1); }}>
        <label>Buscar por {tipo === 'productos' ? 'código o nombre' : 'nombre'}<input value={busqueda} maxLength={160} onChange={e => setBusqueda(e.target.value)} /></label>
        <label>Estado<select aria-label="Estado" value={estado} onChange={e => { setEstado(e.target.value); setPagina(1); }}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></select></label>
        <button>Buscar</button>{dueno && <button type="button" disabled={ocupado} onClick={() => abrir(null)}>Crear nuevo</button>}
      </form>
      {cargando ? <p role="status">Cargando catálogo…</p> : <>
        <p>{lista.total} registros · página {pagina} de {lista.paginas}</p>
        {!lista.items.length && <p>No hay registros con esos filtros.</p>}
        <div className="catalogo-grid">{lista.items.map(item => <article key={item.id}>
          <h2>{item.nombre}</h2><p>{item.activo ? 'Activo' : 'Inactivo'}</p>
          {tipo === 'productos' ? <><p>Código: {item.codigo} · {item.unidad === 'KG' ? 'kg' : 'unidades'}</p><dl><dt>Stock actual</dt><dd>{item.stockActual}</dd><dt>Mínimo / objetivo</dt><dd>{item.stockMinimo} / {item.stockObjetivo}</dd><dt>Categoría</dt><dd>{item.categoria.nombre}</dd><dt>Proveedor</dt><dd>{item.proveedor.nombre}</dd></dl></> : tipo === 'proveedores' && <p>{item.telefono || 'Sin teléfono'} · {item.correo || 'Sin correo'}</p>}
          {dueno && <div className="catalogo-actions"><button aria-label={`Editar ${item.nombre}`} disabled={ocupado} onClick={() => abrir(item)}>Editar</button><button aria-label={`${item.activo ? 'Desactivar' : 'Reactivar'} ${item.nombre}`} disabled={ocupado} className="secondary" onClick={() => actividad(item)}>{item.activo ? 'Desactivar' : 'Reactivar'}</button></div>}
        </article>)}</div>
        <div className="catalogo-actions"><button disabled={pagina <= 1 || ocupado} onClick={() => setPagina(n => n - 1)}>Anterior</button><button disabled={pagina >= lista.paginas || ocupado} onClick={() => setPagina(n => n + 1)}>Siguiente</button></div>
      </>}
    </>}
  </section>;
}

