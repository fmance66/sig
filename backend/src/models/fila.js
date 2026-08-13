const pool = require('../config/db');

const VALUE_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `value_${n}`);
const COLS = ['tabla', 'fila', ...VALUE_COLS].join(', ');

async function listByTabla(tabla) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_fila WHERE tabla = $1 ORDER BY fila`, [tabla]
  );
  return rows;
}

async function create(tabla, data) {
  const { rows: nextRows } = await pool.query(
    `SELECT COALESCE(MAX(fila), 0) + 1 AS next FROM sld_fila WHERE tabla = $1`, [tabla]
  );
  const fila = nextRows[0].next;
  const vals = VALUE_COLS.map(c => (data[c] === '' ? null : data[c] ?? null));
  const { rows } = await pool.query(
    `INSERT INTO sld_fila (tabla, fila, ${VALUE_COLS.join(',')})
     VALUES ($1, $2, ${VALUE_COLS.map((_, i) => `$${i + 3}`).join(',')})
     RETURNING ${COLS}`,
    [tabla, fila, ...vals]
  );
  return rows[0];
}

async function remove(tabla, fila) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_fila WHERE tabla = $1 AND fila = $2`, [tabla, fila]
  );
  return rowCount > 0;
}

module.exports = { listByTabla, create, remove };
