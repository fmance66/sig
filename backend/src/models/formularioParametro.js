const pool = require('../config/db');

const COLUMNS = `formulario, parametro, descripcion, texto, x, y, ancho, alto, orden,
  alignment, font, border_color, background_color, auto_height, print, condicion`;

// Factory reusada por sld_formulario_recibo_parametro y
// sld_formulario_libro_parametro (misma forma, distinta tabla padre).
function createParametroModel(tableName) {
  async function list(formulario) {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS}
       FROM ${tableName} WHERE formulario = $1 ORDER BY orden NULLS LAST, parametro`,
      [formulario]
    );
    return rows;
  }

  async function create(formulario, data) {
    const num = v => (v === '' || v === undefined ? null : v);
    const bool = (v, def) => (v === undefined ? def : Boolean(v));
    const { rows } = await pool.query(
      `INSERT INTO ${tableName}
         (formulario, parametro, descripcion, texto, x, y, ancho, alto, orden,
          alignment, font, border_color, background_color, auto_height, print, condicion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING ${COLUMNS}`,
      [formulario, data.parametro, data.descripcion || null, data.texto || null,
        num(data.x), num(data.y), num(data.ancho), num(data.alto), num(data.orden),
        data.alignment || null, data.font || null, data.border_color || null,
        data.background_color || null, bool(data.auto_height, false), bool(data.print, true),
        data.condicion || null]
    );
    return rows[0];
  }

  async function update(formulario, parametro, data) {
    const num = v => (v === '' || v === undefined ? null : v);
    const bool = (v, def) => (v === undefined ? def : Boolean(v));
    const { rows } = await pool.query(
      `UPDATE ${tableName}
         SET parametro = $3, descripcion = $4, texto = $5, x = $6, y = $7, ancho = $8, alto = $9,
             orden = $10, alignment = $11, font = $12, border_color = $13, background_color = $14,
             auto_height = $15, print = $16, condicion = $17
       WHERE formulario = $1 AND parametro = $2
       RETURNING ${COLUMNS}`,
      [formulario, parametro, data.parametro, data.descripcion || null, data.texto || null,
        num(data.x), num(data.y), num(data.ancho), num(data.alto), num(data.orden),
        data.alignment || null, data.font || null, data.border_color || null,
        data.background_color || null, bool(data.auto_height, false), bool(data.print, true),
        data.condicion || null]
    );
    return rows[0] ?? null;
  }

  async function remove(formulario, parametro) {
    const { rowCount } = await pool.query(
      `DELETE FROM ${tableName} WHERE formulario = $1 AND parametro = $2`, [formulario, parametro]
    );
    return rowCount > 0;
  }

  return { list, create, update, remove };
}

module.exports = { createParametroModel };
