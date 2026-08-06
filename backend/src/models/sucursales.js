const pool = require('../config/db');

const SELECT_COLS = `id, empresa, sucursal, nombre_fantasia, direccion,
  localidad, provincia, cpa, codigo_zona, telefono, email, login, orden`;

const MUTABLE = [
  'empresa','sucursal','nombre_fantasia','direccion','localidad',
  'provincia','cpa','codigo_zona','telefono','email','login','orden',
];

const INTEGER_COLS = new Set(['orden']);

function normalize(col, val) {
  if (val === '' || val === undefined) return null;
  if (INTEGER_COLS.has(col) && val !== null) return Number(val) || null;
  return val;
}

async function listByEmpresa(empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM sys_sucursal WHERE empresa = $1 ORDER BY orden NULLS LAST, id`,
    [empresa]
  );
  return rows;
}

async function create(data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined && data[c] !== '');
  const vals = cols.map(c => normalize(c, data[c]));
  const ph   = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sys_sucursal (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0];
}

async function update(id, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) {
    const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sys_sucursal WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = [id, ...cols.map(c => normalize(c, data[c]))];
  const { rows } = await pool.query(
    `UPDATE sys_sucursal SET ${sets.join(',')} WHERE id = $1 RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sys_sucursal WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { listByEmpresa, create, update, remove };
