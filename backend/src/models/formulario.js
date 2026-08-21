const pool = require('../config/db');

const COLUMNS = `id, empresa, nombre, descripcion, orientacion, pagina, margen_superior, margen_inferior,
  margen_izquierdo, margen_derecho, formulario_hermano, formula_archivo, columnas, filas, copias,
  propiedad, etiquetas, orden`;

const MUTABLE = [
  'nombre', 'descripcion', 'orientacion', 'pagina', 'margen_superior', 'margen_inferior',
  'margen_izquierdo', 'margen_derecho', 'formulario_hermano', 'formula_archivo', 'columnas', 'filas',
  'copias', 'propiedad', 'etiquetas', 'orden',
];

const NUMERIC = new Set([
  'margen_superior', 'margen_inferior', 'margen_izquierdo', 'margen_derecho',
  'formulario_hermano', 'columnas', 'filas', 'copias', 'orden',
]);

function normalize(col, val) {
  if (val === '' || val === undefined) return null;
  if (NUMERIC.has(col) && val !== null) return Number(val) || null;
  return val;
}

// Factory reusada por sld_formulario_recibo y sld_formulario_libro — mismas
// columnas, cada diseño pertenece a una empresa (nombre único por empresa,
// no global, porque el legacy traía un diseño distinto por empresa).
function createFormularioModel(tableName) {
  async function list(empresa) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM ${tableName} WHERE empresa = $1 ORDER BY orden NULLS LAST, nombre`,
      [empresa]
    );
    return rows;
  }

  async function getById(id) {
    const { rows } = await pool.query(`SELECT ${COLUMNS} FROM ${tableName} WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async function create(empresa, data) {
    const cols = MUTABLE.filter(c => data[c] !== undefined);
    const allCols = ['empresa', ...cols];
    const vals = [empresa, ...cols.map(c => normalize(c, data[c]))];
    const ph = allCols.map((_, i) => `$${i + 1}`);
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (${allCols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${COLUMNS}`,
      vals
    );
    return rows[0];
  }

  async function update(id, data) {
    const cols = MUTABLE.filter(c => data[c] !== undefined);
    if (!cols.length) return getById(id);
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = [id, ...cols.map(c => normalize(c, data[c]))];
    const { rows } = await pool.query(
      `UPDATE ${tableName} SET ${sets.join(',')} WHERE id = $1 RETURNING ${COLUMNS}`, vals
    );
    return rows[0] ?? null;
  }

  async function remove(id) {
    const { rowCount } = await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
    return rowCount > 0;
  }

  return { list, getById, create, update, remove };
}

module.exports = { createFormularioModel };
