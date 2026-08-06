const pool = require('../config/db');

async function listByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT n.empleado, n.tipo_novedad, n.fecha, n.value, t.descripcion AS tipo_novedad_desc
     FROM sld_novedad n
     LEFT JOIN sld_tipo_novedad t ON t.id = n.tipo_novedad
     WHERE n.empleado = $1
     ORDER BY n.fecha DESC`,
    [empleado]
  );
  return rows;
}

async function create(empleado, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_novedad (empleado, tipo_novedad, fecha, value)
     VALUES ($1, $2, $3, $4)
     RETURNING empleado, tipo_novedad, fecha, value`,
    [empleado, data.tipo_novedad, data.fecha, data.value ?? null]
  );
  return rows[0];
}

async function remove(empleado, tipo_novedad, fecha) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_novedad WHERE empleado = $1 AND tipo_novedad = $2 AND fecha = $3',
    [empleado, tipo_novedad, fecha]
  );
  return rowCount > 0;
}

module.exports = { listByEmpleado, create, remove };
