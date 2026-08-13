const pool = require('../config/db');

async function listByClase(clase) {
  const { rows } = await pool.query(
    `SELECT cg.clase, cg.grupo, cg.orden, g.descripcion
     FROM sld_clase_grupo cg
     LEFT JOIN sld_grupo g ON g.id = cg.grupo
     WHERE cg.clase = $1
     ORDER BY cg.orden NULLS LAST, cg.grupo`,
    [clase]
  );
  return rows;
}

async function create(clase, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_clase_grupo (clase, grupo, orden) VALUES ($1, $2, $3)
     RETURNING clase, grupo, orden`,
    [clase, data.grupo, data.orden === '' ? null : data.orden ?? null]
  );
  return rows[0];
}

async function remove(clase, grupo) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_clase_grupo WHERE clase = $1 AND grupo = $2`, [clase, grupo]
  );
  return rowCount > 0;
}

module.exports = { listByClase, create, remove };
