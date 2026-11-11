// Una sola consulta obtiene faltantes, proveedor y fecha bajo la misma fotografía de PostgreSQL.
// No crea órdenes ni modifica productos o movimientos (RN-12 a RN-14).
async function faltantes(db, identidad) {
  return db.$queryRaw`
    SELECT p.id, p.codigo, p.nombre, p.unidad,
           p.stock_actual AS "stockActual", p.stock_minimo AS "stockMinimo",
           p.stock_objetivo - p.stock_actual AS sugerida,
           v.id AS "proveedorId", v.nombre AS "proveedorNombre",
           statement_timestamp() AS "calculadaEn"
    FROM productos p JOIN proveedores v ON v.id = p.proveedor_id AND v.comercio_id = p.comercio_id
    WHERE p.comercio_id = ${identidad.comercioId}::uuid
      AND p.activo AND p.stock_actual < p.stock_minimo
    ORDER BY v.nombre, v.id, p.nombre, p.id`;
}

function producto(fila) {
  return {
    id: fila.id, codigo: fila.codigo, nombre: fila.nombre, unidad: fila.unidad,
    stockActual: fila.stockActual.toString(), stockMinimo: fila.stockMinimo.toString(),
  };
}

export async function consultarAlertas(db, identidad) {
  return { items: (await faltantes(db, identidad)).map(fila => ({
    ...producto(fila), proveedor: { id: fila.proveedorId, nombre: fila.proveedorNombre },
  })) };
}

export async function generarLista(db, identidad) {
  const filas = await faltantes(db, identidad);
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila.proveedorId)) grupos.set(fila.proveedorId, {
      proveedor: { id: fila.proveedorId, nombre: fila.proveedorNombre }, items: [],
    });
    grupos.get(fila.proveedorId).items.push({ ...producto(fila), cantidad: fila.sugerida.toString() });
  }
  return { calculadaEn: filas[0]?.calculadaEn ?? new Date(), grupos: [...grupos.values()] };
}
