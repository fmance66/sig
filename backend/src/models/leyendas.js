const pool = require('../config/db');

// id es SERIAL (el legacy no tiene clave natural para leyenda, solo texto+orden) —
// por eso no usa la factory genérica de catalogo.js, que siempre inserta `id` a mano.
const SELECT_COLS = 'id, empresa, leyenda, orden';

async function list(empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM cnt_leyenda WHERE empresa = $1 ORDER BY orden NULLS LAST, id`,
    [empresa]
  );
  return rows;
}

async function getById(id, empresa) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM cnt_leyenda WHERE id = $1 AND empresa = $2`,
    [id, empresa]
  );
  return rows[0] ?? null;
}

async function create({ empresa, leyenda, orden }) {
  const { rows } = await pool.query(
    `INSERT INTO cnt_leyenda (empresa, leyenda, orden) VALUES ($1,$2,$3) RETURNING ${SELECT_COLS}`,
    [empresa, leyenda ?? null, orden === '' || orden === undefined ? null : Number(orden)]
  );
  return rows[0];
}

async function update(id, empresa, { leyenda, orden }) {
  const { rows } = await pool.query(
    `UPDATE cnt_leyenda SET leyenda = $3, orden = $4 WHERE id = $1 AND empresa = $2 RETURNING ${SELECT_COLS}`,
    [id, empresa, leyenda ?? null, orden === '' || orden === undefined ? null : Number(orden)]
  );
  return rows[0] ?? null;
}

async function remove(id, empresa) {
  const { rowCount } = await pool.query('DELETE FROM cnt_leyenda WHERE id = $1 AND empresa = $2', [id, empresa]);
  return rowCount > 0;
}

module.exports = { list, getById, create, update, remove };
