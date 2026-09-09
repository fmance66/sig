const pool = require('../config/db');

const COLUMNS = ['descripcion', 'saldo', 'naturaleza', 'imputable', 'monetaria', 'tipo',
  'jerarquia', 'nivel', 'leyenda', 'orden', 'id_padre'];
const NUMERIC = ['nivel', 'orden'];
const BOOLEAN = ['imputable', 'monetaria'];
const SELECT_COLS = ['id', 'empresa', ...COLUMNS].join(', ');

// Igual que catalogo.js: no usar `Number(val) || null`, 0 es un valor legítimo (ej. nivel=0).
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
    `SELECT ${SELECT_COLS} FROM cnt_cuenta WHERE empresa = $1 ORDER BY orden NULLS LAST, id`,
    [empresa]
  );
  return rows;
}

async function getById(id, empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM cnt_cuenta WHERE id = $1 AND empresa = $2`,
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
    `INSERT INTO cnt_cuenta (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${SELECT_COLS}`,
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
    `UPDATE cnt_cuenta SET ${sets.join(',')} WHERE id = $1 AND empresa = $2 RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id, empresa) {
  const { rowCount } = await pool.query(
    'DELETE FROM cnt_cuenta WHERE id = $1 AND empresa = $2',
    [id, empresa]
  );
  return rowCount > 0;
}

// Arma el árbol en memoria a partir del listado plano (id_padre) — no hay consultas
// recursivas en el proyecto, ni siquiera para bas_proyecto que también es jerárquico.
function buildTree(rows) {
  const nodes = new Map(rows.map(r => [r.id, {
    key: r.id,
    label: `${r.id} - ${r.descripcion ?? ''}`,
    data: r,
    children: [],
  }]));
  const roots = [];
  for (const r of rows) {
    const node = nodes.get(r.id);
    const padre = r.id_padre && nodes.get(r.id_padre);
    if (padre) padre.children.push(node);
    else roots.push(node);
  }
  return roots;
}

async function arbol(empresa) {
  return buildTree(await list(empresa));
}

async function getCentrosCosto(cuenta, empresa) {
  const { rows } = await pool.query(
    `SELECT p.centro_de_costo, c.descripcion, p.porcentaje
     FROM cnt_prorrateo p
     JOIN cnt_centro_de_costo c ON c.id = p.centro_de_costo AND c.empresa = p.empresa
     WHERE p.cuenta = $1 AND p.empresa = $2
     ORDER BY c.orden NULLS LAST, c.id`,
    [cuenta, empresa]
  );
  return rows;
}

// Reemplaza todo el prorrateo de la cuenta de una sola vez (la pestaña "Centros de
// Costo" del modal manda la lista completa, no altas/bajas individuales).
async function setCentrosCosto(cuenta, empresa, items) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM cnt_prorrateo WHERE cuenta = $1 AND empresa = $2', [cuenta, empresa]);
    for (const item of items) {
      await client.query(
        'INSERT INTO cnt_prorrateo (cuenta, centro_de_costo, empresa, porcentaje) VALUES ($1,$2,$3,$4)',
        [cuenta, item.centro_de_costo, empresa, normalize('porcentaje', item.porcentaje)]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getCentrosCosto(cuenta, empresa);
}

module.exports = { list, getById, create, update, remove, arbol, getCentrosCosto, setCentrosCosto };
