const pool = require('../config/db');

const COLUMNS = ['descripcion', 'modulo', 'columna_total', 'fila_total', 'orden'];
const NUMERIC = ['columna_total', 'fila_total', 'orden'];
const SELECT_COLS = ['id', 'empresa', ...COLUMNS].join(', ');

const IMPUESTO_COLUMNS = ['rubro', 'alicuota', 'importe', 'formula_alicuota', 'formula_importe', 'etiqueta', 'columna', 'fila'];
const IMPUESTO_NUMERIC = ['alicuota', 'importe', 'columna', 'fila'];

// Igual que cuentas.js/catalogo.js: no usar `Number(val) || null`, 0 es un valor legítimo.
function normalize(col, val, numericCols = NUMERIC) {
  if (val === '' || val === undefined) return null;
  if (numericCols.includes(col) && val !== null) {
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }
  return val;
}

async function list(empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM iva_modelo_comprobante WHERE empresa = $1 ORDER BY orden NULLS LAST, id`,
    [empresa]
  );
  return rows;
}

async function getById(id, empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM iva_modelo_comprobante WHERE id = $1 AND empresa = $2`,
    [id, empresa]
  );
  return rows[0] ?? null;
}

async function create(data) {
  const extraCols = COLUMNS.filter(c => data[c] !== undefined);
  const cols = ['id', 'empresa', ...extraCols];
  const vals = [data.id, data.empresa, ...extraCols.map(c => normalize(c, data[c]))];
  const ph = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO iva_modelo_comprobante (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0];
}

async function update(id, empresa, data) {
  const cols = COLUMNS.filter(c => data[c] !== undefined);
  if (!cols.length) return getById(id, empresa);
  const sets = cols.map((c, i) => `${c} = $${i + 3}`);
  const vals = [id, empresa, ...cols.map(c => normalize(c, data[c]))];
  const { rows } = await pool.query(
    `UPDATE iva_modelo_comprobante SET ${sets.join(',')} WHERE id = $1 AND empresa = $2 RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id, empresa) {
  const { rowCount } = await pool.query(
    'DELETE FROM iva_modelo_comprobante WHERE id = $1 AND empresa = $2',
    [id, empresa]
  );
  return rowCount > 0;
}

async function getImpuestos(modelo, empresa) {
  const { rows } = await pool.query(
    `SELECT mi.id, mi.modelo, mi.impuesto, mi.rubro, mi.empresa, mi.alicuota, mi.importe,
            mi.formula_alicuota, mi.formula_importe, mi.etiqueta, mi.columna, mi.fila,
            i.nombre AS impuesto_nombre, i.tipo AS impuesto_tipo, r.descripcion AS rubro_descripcion
     FROM iva_modelo_impuesto mi
     JOIN iva_impuesto i ON i.id = mi.impuesto AND i.empresa = mi.empresa
     LEFT JOIN bas_rubro r ON r.id = mi.rubro AND r.empresa = mi.empresa
     WHERE mi.modelo = $1 AND mi.empresa = $2
     ORDER BY mi.fila NULLS LAST, mi.columna NULLS LAST, mi.id`,
    [modelo, empresa]
  );
  return rows;
}

// Reemplaza todos los impuestos del modelo de una sola vez (la pestaña "Impuestos" del
// modal manda la lista completa) — mismo patrón que setCentrosCosto en cuentas.js.
// `id` es SERIAL: no se especifica en el INSERT.
async function setImpuestos(modelo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM iva_modelo_impuesto WHERE modelo = $1 AND empresa = $2', [modelo, empresa]);
    for (const item of items) {
      const cols = ['modelo', 'impuesto', 'empresa', ...IMPUESTO_COLUMNS.filter(c => item[c] !== undefined)];
      const vals = [modelo, item.impuesto, empresa,
        ...IMPUESTO_COLUMNS.filter(c => item[c] !== undefined).map(c => normalize(c, item[c], IMPUESTO_NUMERIC))];
      const ph = cols.map((_, i) => `$${i + 1}`);
      await client.query(
        `INSERT INTO iva_modelo_impuesto (${cols.join(',')}) VALUES (${ph.join(',')})`,
        vals
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getImpuestos(modelo, empresa);
}

module.exports = { list, getById, create, update, remove, getImpuestos, setImpuestos };
