const pool = require('../config/db');

function createCatalogoModel(tableName, columns, numericColumns = []) {
  const numeric = new Set(numericColumns);
  const selectCols = ['id', ...columns].join(', ');

  function normalize(col, val) {
    if (val === '' || val === undefined) return null;
    if (numeric.has(col) && val !== null) return Number(val) || null;
    return val;
  }

  async function list() {
    const { rows } = await pool.query(`SELECT ${selectCols} FROM ${tableName} ORDER BY orden NULLS LAST, id`);
    return rows;
  }

  async function getById(id) {
    const { rows } = await pool.query(`SELECT ${selectCols} FROM ${tableName} WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async function create(data) {
    const cols = ['id', ...columns.filter(c => data[c] !== undefined)];
    const vals = cols.map(c => normalize(c, data[c]));
    const ph   = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${selectCols}`, vals
    );
    return rows[0];
  }

  async function update(id, data) {
    const cols = columns.filter(c => data[c] !== undefined);
    if (!cols.length) return getById(id);
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = [id, ...cols.map(c => normalize(c, data[c]))];
    const { rows } = await pool.query(
      `UPDATE ${tableName} SET ${sets.join(',')} WHERE id = $1 RETURNING ${selectCols}`, vals
    );
    return rows[0] ?? null;
  }

  async function remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    return rowCount > 0;
  }

  return { list, getById, create, update, remove };
}

module.exports = { createCatalogoModel };
