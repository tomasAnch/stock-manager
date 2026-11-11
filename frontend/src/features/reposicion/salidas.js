// Milésimas enteras: validamos y formateamos sin redondear cantidades con punto flotante.
export function cantidadValida(valor, unidad) {
  // En unidades, solo dígitos: 1.000 no debe confundirse con mil.
  if (unidad === 'UNIDAD') return typeof valor === 'string' && /^\d{1,9}$/.test(valor) && BigInt(valor) > 0n;
  if (!['UNIDAD', 'KG'].includes(unidad) || typeof valor !== 'string' || !/^\d{1,9}([.,]\d{1,3})?$/.test(valor)) return false;
  const [entero, decimal = ''] = valor.replace(',', '.').split('.');
  const milesimas = BigInt(entero) * 1000n + BigInt(decimal.padEnd(3, '0'));
  return milesimas > 0n && (unidad === 'KG' || milesimas % 1000n === 0n);
}

export function formatearCantidad(valor, unidad) {
  const [entero, decimal = ''] = String(valor).replace(',', '.').split('.');
  return unidad === 'KG' ? `${BigInt(entero)},${decimal.padEnd(3, '0')}` : BigInt(entero).toString();
}

export function fechaArgentina(iso) {
  // RN-14 fija expresamente el desplazamiento -03:00, independiente del equipo que descarga.
  return new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ') + '-03:00';
}

export function itemsSeleccionados(grupo) {
  const items = grupo.items.filter(item => !item.omitido);
  if (!items.length) throw new Error('No quedan productos incluidos para este proveedor.');
  for (const item of items) if (!cantidadValida(item.cantidad, item.unidad)) throw new Error(`Revisá la cantidad de ${item.nombre}.`);
  return items;
}

function celda(valor) {
  let texto = String(valor);
  if (/^\s*[=+\-@]/u.test(texto)) texto = `'${texto}`;
  return /[;"\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function crearTexto(grupo, calculadaEn) {
  const items = itemsSeleccionados(grupo);
  return [`Proveedor: ${grupo.proveedor.nombre}`, `Fecha del cálculo: ${fechaArgentina(calculadaEn)}`, '',
    ...items.map(p => {
      const cantidad = formatearCantidad(p.cantidad, p.unidad);
      const unidad = p.unidad === 'KG' ? 'kg' : cantidad === '1' ? 'unidad' : 'unidades';
      return `${p.codigo} — ${p.nombre}: ${cantidad} ${unidad}`;
    }),
  ].join('\r\n');
}

export function crearCSV(grupo, calculadaEn) {
  const items = itemsSeleccionados(grupo);
  const filas = items.map(p => [grupo.proveedor.nombre, fechaArgentina(calculadaEn), p.codigo, p.nombre, formatearCantidad(p.cantidad, p.unidad), p.unidad].map(celda).join(';'));
  return '\uFEFF' + ['proveedor;fecha_calculo;codigo;nombre;cantidad;unidad', ...filas].join('\r\n') + '\r\n';
}
