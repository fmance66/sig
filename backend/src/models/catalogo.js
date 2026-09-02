const pool = require('../config/db');

// idColumn puede ser un string (clave simple, ej. 'id') o un array (clave compuesta,
// ej. ['id', 'empresa'] para catálogos escopados por empresa — ver sld_concepto). Con
// clave compuesta, getById/update/remove reciben un array de valores en el mismo orden
// que idColumn, y create espera esas columnas presentes en `data` (ej. data.id, data.empresa).
function createCatalogoModel(tableName, columns, numericColumns = [], options = {}) {
  const { idColumn = 'id' } = options;
  const idCols = Array.isArray(idColumn) ? idColumn : [idColumn];
  const numeric = new Set(numericColumns);
  const hasOrden = columns.includes('orden');
  // clave simple con nombre distinto de 'id' (ej. 'fecha', 'localidad'): se alias a "id" para
  // que el resto de la app pueda seguir leyendo row.id sin importar el nombre real de la PK.
  const idSelect = idCols.length === 1 && idCols[0] !== 'id' ? `${idCols[0]} AS id` : idCols.join(', ');
  const selectCols = [idSelect, ...columns].join(', ');
  const orderClause = hasOrden ? `orden NULLS LAST, ${idCols.join(',')}` : idCols.join(',');
  const whereId = idCols.map((c, i) => `${c} = $${i + 1}`).join(' AND ');
  const idVals = id => (Array.isArray(id) ? id : [id]);

  function normalize(col, val) {
    if (val === '' || val === undefined) return null;
    if (numeric.has(col) && val !== null) return Number(val) || null;
    return val;
  }

  // filtros: { columna: valor } opcional — usado por catálogos escopados (ej. sld_concepto
  // por empresa) para no traer todo el catálogo global de una sola pasada.
  async function list(filtros = {}) {
    const entradas = Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null);
    const where = entradas.length ? `WHERE ${entradas.map(([c], i) => `${c} = $${i + 1}`).join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT ${selectCols} FROM ${tableName} ${where} ORDER BY ${orderClause}`,
      entradas.map(([, v]) => v)
    );
    return rows;
  }

  async function getById(id) {
    const { rows } = await pool.query(`SELECT ${selectCols} FROM ${tableName} WHERE ${whereId}`, idVals(id));
    return rows[0] ?? null;
  }

  async function create(data) {
    const extraCols = columns.filter(c => data[c] !== undefined);
    const cols = [...idCols, ...extraCols];
    const vals = [...idCols.map(c => normalize(c, data[c])), ...extraCols.map(c => normalize(c, data[c]))];
    const ph   = cols.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${selectCols}`, vals
    );
    return rows[0];
  }

  async function update(id, data) {
    const cols = columns.filter(c => data[c] !== undefined);
    if (!cols.length) return getById(id);
    const base = idCols.length;
    const sets = cols.map((c, i) => `${c} = $${i + base + 1}`);
    const vals = [...idVals(id), ...cols.map(c => normalize(c, data[c]))];
    const { rows } = await pool.query(
      `UPDATE ${tableName} SET ${sets.join(',')} WHERE ${whereId} RETURNING ${selectCols}`, vals
    );
    return rows[0] ?? null;
  }

  async function remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE ${whereId}`, idVals(id));
    return rowCount > 0;
  }

  return { list, getById, create, update, remove };
}

module.exports = { createCatalogoModel };
