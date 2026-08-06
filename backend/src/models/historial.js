const pool = require('../config/db');

async function listByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT h.empleado, h.campo, h.fecha_desde, h.fecha_hasta, h.valor, c.descripcion AS campo_desc
     FROM sld_historial_empleado h
     LEFT JOIN sld_campo_historial c ON c.id = h.campo
     WHERE h.empleado = $1
     ORDER BY h.fecha_desde DESC`,
    [empleado]
  );
  return rows;
}

async function create(empleado, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_historial_empleado (empleado, campo, fecha_desde, fecha_hasta, valor)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING empleado, campo, fecha_desde, fecha_hasta, valor`,
    [empleado, data.campo, data.fecha_desde, data.fecha_hasta ?? null, data.valor ?? null]
  );
  return rows[0];
}

async function remove(empleado, campo, fecha_desde) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_historial_empleado WHERE empleado = $1 AND campo = $2 AND fecha_desde = $3',
    [empleado, campo, fecha_desde]
  );
  return rowCount > 0;
}

module.exports = { listByEmpleado, create, remove };
