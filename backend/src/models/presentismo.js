const pool = require('../config/db');

async function list({ empleado, fechaDesde, fechaHasta, tipo } = {}) {
  const { rows } = await pool.query(
    `SELECT p.empleado, p.fecha, p.hora, p.tipo,
            e.legajo, e.apellido, e.nombre
     FROM sld_presentismo p
     LEFT JOIN sld_empleado e ON e.id = p.empleado
     WHERE ($1::integer IS NULL OR p.empleado = $1)
       AND ($2::date IS NULL OR p.fecha >= $2)
       AND ($3::date IS NULL OR p.fecha <= $3)
       AND ($4::text IS NULL OR p.tipo = $4)
     ORDER BY p.fecha DESC, p.hora DESC`,
    [empleado || null, fechaDesde || null, fechaHasta || null, tipo || null]
  );
  return rows;
}

async function create(empleado, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_presentismo (empleado, fecha, hora, tipo)
     VALUES ($1, $2, $3, $4)
     RETURNING empleado, fecha, hora, tipo`,
    [empleado, data.fecha, data.hora, data.tipo ?? null]
  );
  return rows[0];
}

async function update(empleado, fecha, hora, { tipo }) {
  const { rows } = await pool.query(
    `UPDATE sld_presentismo SET tipo = $4
     WHERE empleado = $1 AND fecha = $2 AND hora = $3
     RETURNING empleado, fecha, hora, tipo`,
    [empleado, fecha, hora, tipo ?? null]
  );
  return rows[0] ?? null;
}

async function remove(empleado, fecha, hora) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_presentismo WHERE empleado = $1 AND fecha = $2 AND hora = $3',
    [empleado, fecha, hora]
  );
  return rowCount > 0;
}

module.exports = { list, create, update, remove };
