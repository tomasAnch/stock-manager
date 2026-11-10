import React, { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../services/api.js';

// Operaciones que ofrece la pantalla. El backend vuelve a controlar rol, tipo y motivo.
const OPERACIONES = [
  { id: 'REPOSICION', tipo: 'INGRESO', motivo: 'REPOSICION', etiqueta: 'Reposición (ingreso)', soloDueno: false },
  { id: 'SALIDA', tipo: 'EGRESO', motivo: 'SALIDA', etiqueta: 'Salida (egreso)', soloDueno: false },
  { id: 'AJUSTE_INGRESO', tipo: 'INGRESO', motivo: 'AJUSTE', etiqueta: 'Ajuste: sumar stock', soloDueno: true },
  { id: 'AJUSTE_EGRESO', tipo: 'EGRESO', motivo: 'AJUSTE', etiqueta: 'Ajuste: restar stock', soloDueno: true },
];
const MOTIVOS = { STOCK_INICIAL: 'Stock inicial', REPOSICION: 'Reposición', SALIDA: 'Salida', AJUSTE: 'Ajuste' };
const VACIO = { items: [], paginas: 1, total: 0 };
// La cantidad decide singular o plural: «1 unidad», «2 unidades», «0.5 kg».
const unidadVisible = (unidad, cantidad) => (unidad === 'KG' ? 'kg' : Number(cantidad) === 1 ? 'unidad' : 'unidades');
const fecha = valor => new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export default function Inventario({ token, usuario, onSesionInvalida }) {
  const dueno = usuario.rol === 'DUENO';
  const operaciones = OPERACIONES.filter(op => dueno || !op.soloDueno);
  const api = (path, options = {}) => apiRequest(`/api/${path}`, { token, ...options });

  // Selector de productos: usa el listado paginado de Catálogo, con búsqueda.
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('activos');
  const [pagina, setPagina] = useState(1);
  const [productos, setProductos] = useState(VACIO);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorProductos, setErrorProductos] = useState('');
  const [revisionProductos, setRevisionProductos] = useState(0);

  // Producto elegido, su historial y el formulario.
  const [seleccionado, setSeleccionado] = useState(null);
  const [historial, setHistorial] = useState(VACIO);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [revisionHistorial, setRevisionHistorial] = useState(0);
  const [operacion, setOperacion] = useState('REPOSICION');
  const [cantidad, setCantidad] = useState('');
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const tituloDetalle = useRef(null);
  const campoCantidad = useRef(null);

  const elegida = operaciones.find(op => op.id === operacion) ?? operaciones[0];
  // Segunda protección: solo se dibuja un historial que pertenezca al producto elegido.
  const movimientos = historial.producto?.id === seleccionado?.id ? historial : VACIO;


  useEffect(() => {
    const controller = new AbortController();
    setCargandoProductos(true); setErrorProductos('');
    api(`catalogo/productos?${new URLSearchParams({ estado, q, pagina })}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setProductos(data); })
      .catch(e => { if (!controller.signal.aborted) { if (e.status === 401) onSesionInvalida(e.message); else setErrorProductos(e.message); } })
      .finally(() => { if (!controller.signal.aborted) setCargandoProductos(false); });
    return () => controller.abort();
  }, [estado, q, pagina, revisionProductos, token]);

  useEffect(() => {
    if (!seleccionado) return undefined;
    const controller = new AbortController();
    setCargandoHistorial(true); setErrorHistorial('');
    api(`inventario/productos/${seleccionado.id}/movimientos?pagina=${paginaHistorial}`, { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        setHistorial(data);
        // El historial trae el saldo y el estado vigentes del producto.
        setSeleccionado(actual => (actual?.id === data.producto.id ? { ...actual, ...data.producto } : actual));
      })
      .catch(e => { if (!controller.signal.aborted) { if (e.status === 401) onSesionInvalida(e.message); else setErrorHistorial(e.message); } })
      .finally(() => { if (!controller.signal.aborted) setCargandoHistorial(false); });
    return () => controller.abort();
  }, [seleccionado?.id, paginaHistorial, revisionHistorial, token]);

  useEffect(() => { if (seleccionado) tituloDetalle.current?.focus(); }, [seleccionado?.id]);

  // Cambiar filtros vacía la lista en el mismo paso: nunca se muestran filas de una consulta anterior.
  function filtrar(cambios) {
    setProductos(VACIO); setCargandoProductos(true);
    if ('q' in cambios) setQ(cambios.q);
    if ('estado' in cambios) setEstado(cambios.estado);
    setPagina(cambios.pagina ?? 1);
    setRevisionProductos(n => n + 1); // repite la consulta aunque el filtro no haya cambiado
  }

  function elegir(producto) {
    if (producto.id === seleccionado?.id) return;
    setHistorial(VACIO); setCargandoHistorial(true); setPaginaHistorial(1);
    setSeleccionado(producto);
    setCantidad(''); setObservacion(''); setError(''); setAviso('');
  }

  async function registrar(event) {
    event.preventDefault();
    if (enviando || !seleccionado) return;
    // La respuesta pertenece al producto enviado. Mientras se espera, el selector queda bloqueado
    // y, por las dudas, nada de la respuesta se aplica a otro producto.
    const enviado = seleccionado;
    const sigueElegido = actual => actual?.id === enviado.id;
    setEnviando(true); setError(''); setAviso('');
    const texto = cantidad.trim().replace(',', '.');
    const body = { productoId: enviado.id, tipo: elegida.tipo, motivo: elegida.motivo, cantidad: texto };
    if (observacion.trim()) body.observacion = observacion;
    try {
      const { producto, movimiento } = await api('inventario/movimientos', { method: 'POST', body });
      setSeleccionado(actual => (sigueElegido(actual) ? { ...actual, ...producto } : actual));
      setAviso(`Movimiento registrado en ${enviado.nombre}: ${elegida.etiqueta.toLowerCase()} de ${movimiento.cantidad} ${unidadVisible(producto.unidad, movimiento.cantidad)}. Saldo actual: ${producto.stockActual} ${unidadVisible(producto.unidad, producto.stockActual)}.`);
      setCantidad(''); setObservacion('');
      setPaginaHistorial(1); setRevisionHistorial(n => n + 1); setRevisionProductos(n => n + 1);
    } catch (e) {
      if (e.status === 401) { onSesionInvalida(e.message); return; }
      if (e.status === 0) {
        // No se sabe si el servidor confirmó: se actualiza el historial en lugar de reintentar.
        setError(`No pudimos confirmar si el movimiento de ${enviado.nombre} se registró porque falló la conexión. Revisá su historial antes de volver a intentarlo.`);
        setRevisionHistorial(n => n + 1);
      } else {
        setError(e.message);
        if (e.status === 409) setRevisionHistorial(n => n + 1); // saldo o estado cambiaron: mostrar los vigentes
      }
    } finally {
      setEnviando(false);
      setTimeout(() => campoCantidad.current?.focus(), 0);
    }
  }

  return (
    <section className="inventario" aria-labelledby="inventario-titulo">
      <h1 id="inventario-titulo">Inventario</h1>
      <p>Elegí un producto para registrar {dueno ? 'reposiciones, salidas o ajustes' : 'reposiciones o salidas'} y revisar su historial.</p>

      <div className="inventario-layout">
        <div className="inventario-selector">
          <h2>Productos</h2>
          <form className="inventario-filtros" onSubmit={event => { event.preventDefault(); filtrar({ q: busqueda.trim() }); }}>
            <label>Buscar por código o nombre<input value={busqueda} onChange={e => setBusqueda(e.target.value)} maxLength={160} disabled={enviando} /></label>
            <button type="submit" disabled={enviando}>Buscar</button>
            <label>Estado
              <select value={estado} disabled={enviando} onChange={e => filtrar({ estado: e.target.value })}>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos (solo historial)</option>
                <option value="todos">Todos</option>
              </select>
            </label>
          </form>
          {enviando && <p role="status" className="inventario-vacio">Esperá la respuesta del movimiento de {seleccionado.nombre} para elegir otro producto.</p>}
          {errorProductos && <p role="alert" className="form-error">{errorProductos}</p>}
          {cargandoProductos ? <p role="status">Cargando productos…</p> : productos.items.length === 0 ? <p>No hay productos con esos filtros.</p> : (
            <ul className="inventario-productos">
              {productos.items.map(producto => (
                <li key={producto.id}>
                  <button type="button" aria-pressed={producto.id === seleccionado?.id} aria-label={`Seleccionar ${producto.nombre} (${producto.codigo})`} disabled={enviando} onClick={() => elegir(producto)}>
                    <strong>{producto.nombre}</strong>
                    <span>{producto.codigo} · {producto.stockActual} {unidadVisible(producto.unidad, producto.stockActual)}{producto.activo ? '' : ' · inactivo'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!cargandoProductos && productos.paginas > 1 && (
            <div className="inventario-paginas">
              <button type="button" className="secondary" disabled={pagina <= 1 || enviando} onClick={() => filtrar({ pagina: pagina - 1 })}>Anterior</button>
              <span>Página {pagina} de {productos.paginas}</span>
              <button type="button" className="secondary" disabled={pagina >= productos.paginas || enviando} onClick={() => filtrar({ pagina: pagina + 1 })}>Siguiente</button>
            </div>
          )}
        </div>

        <div className="inventario-detalle">
          {!seleccionado ? <p className="inventario-vacio">Elegí un producto de la lista para registrar un movimiento o ver su historial.</p> : <>
            <h2 ref={tituloDetalle} tabIndex={-1}>{seleccionado.nombre}</h2>
            <p className="inventario-saldo">
              Código {seleccionado.codigo} · Saldo disponible: <strong>{seleccionado.stockActual} {unidadVisible(seleccionado.unidad, seleccionado.stockActual)}</strong>
              {!seleccionado.activo && ' · Producto inactivo'}
            </p>
            {aviso && <p role="status" className="inventario-aviso">{aviso}</p>}
            {error && <p role="alert" className="form-error">{error}</p>}

            {seleccionado.activo ? (
              <form className="inventario-form" onSubmit={registrar} noValidate>
                <fieldset disabled={enviando}>
                  <legend>Registrar movimiento</legend>
                  <label>Operación
                    <select value={elegida.id} onChange={e => setOperacion(e.target.value)}>
                      {operaciones.map(op => <option key={op.id} value={op.id}>{op.etiqueta}</option>)}
                    </select>
                  </label>
                  <label>Cantidad ({seleccionado.unidad === 'KG' ? 'kg' : 'unidades'})
                    <input ref={campoCantidad} value={cantidad} onChange={e => setCantidad(e.target.value)} inputMode={seleccionado.unidad === 'KG' ? 'decimal' : 'numeric'} autoComplete="off" aria-describedby="ayuda-cantidad" />
                  </label>
                  <small id="ayuda-cantidad">{seleccionado.unidad === 'KG' ? 'Hasta 3 decimales, con coma o punto. Ej.: 0,250' : 'Solo unidades enteras. Ej.: 2'}</small>
                  <label>Observación{elegida.motivo === 'AJUSTE' ? ' (obligatoria: explicá el motivo del ajuste)' : ' (opcional)'}
                    <textarea value={observacion} onChange={e => setObservacion(e.target.value)} maxLength={500} rows={2} />
                  </label>
                  <button type="submit">{enviando ? 'Registrando…' : 'Registrar'}</button>
                </fieldset>
              </form>
            ) : <p className="inventario-vacio">Un producto inactivo no admite movimientos. Podés consultar su historial; el dueño puede reactivarlo desde Catálogo.</p>}

            <h3>Historial</h3>
            {/* El estado vacío solo se muestra después de una consulta exitosa del producto elegido. */}
            {errorHistorial ? (
              <div role="alert" className="inventario-error-historial">
                <p className="form-error">No pudimos cargar el historial: {errorHistorial}</p>
                <button type="button" className="secondary" onClick={() => { setHistorial(VACIO); setCargandoHistorial(true); setRevisionHistorial(n => n + 1); }}>Reintentar</button>
              </div>
            ) : cargandoHistorial || movimientos.producto?.id !== seleccionado.id ? <p role="status">Cargando historial…</p> : movimientos.items.length === 0 ? <p>Este producto todavía no tiene movimientos.</p> : <>
              <ol className="inventario-historial">
                {movimientos.items.map(mov => (
                  <li key={mov.id}>
                    <div><strong>{mov.tipo === 'INGRESO' ? '+' : '−'}{mov.cantidad} {unidadVisible(seleccionado.unidad, mov.cantidad)}</strong> · {mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} por {MOTIVOS[mov.motivo].toLowerCase()}</div>
                    <div className="inventario-meta"><time dateTime={mov.creadoEn}>{fecha(mov.creadoEn)}</time> · {mov.usuario.nombre}</div>
                    {mov.observacion && <div className="inventario-obs">{mov.observacion}</div>}
                  </li>
                ))}
              </ol>
              <div className="inventario-paginas">
                <button type="button" className="secondary" disabled={paginaHistorial <= 1} onClick={() => { setHistorial(VACIO); setCargandoHistorial(true); setPaginaHistorial(n => n - 1); }}>Más recientes</button>
                <span>Página {movimientos.pagina} de {movimientos.paginas} · {movimientos.total} movimientos</span>
                <button type="button" className="secondary" disabled={paginaHistorial >= movimientos.paginas} onClick={() => { setHistorial(VACIO); setCargandoHistorial(true); setPaginaHistorial(n => n + 1); }}>Más antiguos</button>
              </div>
            </>}
          </>}
        </div>
      </div>
    </section>
  );
}
