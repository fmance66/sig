const pool = require('../config/db');

// modelo_asiento_cmp/modelo_asiento_vta quedan fuera (motor de fórmulas de asiento,
// fase futura, ver 008_iva_base.sql).
const COLUMNS = ['descripcion', 'documento', 'saldo', 'moneda', 'concepto_cmp', 'concepto_vta',
  'save_tipo', 'save_punto', 'campo_hasta', 'color', 'orden'];
const NUMERIC = ['orden'];
const BOOLEAN = ['save_tipo', 'save_punto', 'campo_hasta'];
const SELECT_COLS = ['id', 'empresa', ...COLUMNS].join(', ');

// Igual que cuentas.js/catalogo.js: no usar `Number(val) || null`, 0 es un valor legítimo.
function normalize(col, val) {
  if (val === '' || val === undefined) return null;
  if (BOOLEAN.includes(col)) return val === null ? null : Boolean(val);
  if (NUMERIC.includes(col) && val !== null) {
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  }
  return val;
}

async function list(empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM iva_tipo_comprobante WHERE empresa = $1 ORDER BY orden NULLS LAST, id`,
    [empresa]
  );
  return rows;
}

async function getById(id, empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM iva_tipo_comprobante WHERE id = $1 AND empresa = $2`,
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
    `INSERT INTO iva_tipo_comprobante (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${SELECT_COLS}`,
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
    `UPDATE iva_tipo_comprobante SET ${sets.join(',')} WHERE id = $1 AND empresa = $2 RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id, empresa) {
  const { rowCount } = await pool.query(
    'DELETE FROM iva_tipo_comprobante WHERE id = $1 AND empresa = $2',
    [id, empresa]
  );
  return rowCount > 0;
}

async function getLetras(tipo, empresa) {
  const { rows } = await pool.query(
    `SELECT l.tipo, l.letra, l.empresa, l.punto, l.tipo_afip, a.descripcion AS tipo_afip_descripcion
     FROM iva_tipo_letra l
     LEFT JOIN iva_tipo_afip a ON a.id = l.tipo_afip
     WHERE l.tipo = $1 AND l.empresa = $2
     ORDER BY l.letra`,
    [tipo, empresa]
  );
  return rows;
}

// Reemplaza todas las letras del tipo de comprobante de una sola vez (la pestaña
// "Letras" del modal manda la lista completa, no altas/bajas individuales) — mismo
// patrón que setCentrosCosto en cuentas.js.
async function setLetras(tipo, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM iva_tipo_letra WHERE tipo = $1 AND empresa = $2', [tipo, empresa]);
    for (const item of items) {
      await client.query(
        'INSERT INTO iva_tipo_letra (tipo, letra, empresa, punto, tipo_afip) VALUES ($1,$2,$3,$4,$5)',
        [tipo, item.letra, empresa, normalize('punto', item.punto), normalize('tipo_afip', item.tipo_afip)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getLetras(tipo, empresa);
}

module.exports = { list, getById, create, update, remove, getLetras, setLetras };
