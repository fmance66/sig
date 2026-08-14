const pool = require('../config/db');

// Factory reusada por sld_formulario_recibo_parametro y
// sld_formulario_libro_parametro (misma forma, distinta tabla padre).
function createParametroModel(tableName) {
  async function list(formulario) {
    const { rows } = await pool.query(
      `SELECT formulario, parametro, descripcion, texto, x, y, ancho, alto, orden
       FROM ${tableName} WHERE formulario = $1 ORDER BY orden NULLS LAST, parametro`,
      [formulario]
    );
    return rows;
  }

  async function create(formulario, data) {
    const num = v => (v === '' || v === undefined ? null : v);
    const { rows } = await pool.query(
      `INSERT INTO ${tableName} (formulario, parametro, descripcion, texto, x, y, ancho, alto, orden)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING formulario, parametro, descripcion, texto, x, y, ancho, alto, orden`,
      [formulario, data.parametro, data.descripcion || null, data.texto || null,
        num(data.x), num(data.y), num(data.ancho), num(data.alto), num(data.orden)]
    );
    return rows[0];
  }

  async function remove(formulario, parametro) {
    const { rowCount } = await pool.query(
      `DELETE FROM ${tableName} WHERE formulario = $1 AND parametro = $2`, [formulario, parametro]
    );
    return rowCount > 0;
  }

  return { list, create, remove };
}

module.exports = { createParametroModel };
