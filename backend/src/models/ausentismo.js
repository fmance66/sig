const pool = require('../config/db');

async function list({ empleado, motivo, fechaDesde, fechaHasta, empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT a.empleado, a.motivo, a.fecha_desde, a.fecha_hasta, a.observaciones,
            m.descripcion AS motivo_desc, m.tipo AS motivo_tipo,
            e.legajo, e.apellido, e.nombre
     FROM sld_ausentismo a
     LEFT JOIN sld_motivo_ausentismo m ON m.id = a.motivo
     LEFT JOIN sld_empleado e ON e.id = a.empleado
     WHERE ($1::integer IS NULL OR a.empleado = $1)
       AND ($2::text IS NULL OR a.motivo = $2)
       AND ($3::date IS NULL OR a.fecha_desde >= $3)
       AND ($4::date IS NULL OR a.fecha_desde <= $4)
       AND ($5::integer IS NULL OR e.empresa = $5)
     ORDER BY a.fecha_desde DESC, e.apellido, e.nombre`,
    [empleado || null, motivo || null, fechaDesde || null, fechaHasta || null, empresa ? Number(empresa) : null]
  );
  return rows;
}

async function create(empleado, data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_ausentismo (empleado, motivo, fecha_desde, fecha_hasta, observaciones)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING empleado, motivo, fecha_desde, fecha_hasta, observaciones`,
    [empleado, data.motivo, data.fecha_desde, data.fecha_hasta ?? null, data.observaciones ?? null]
  );
  return rows[0];
}

async function update(empleado, motivo, fechaDesde, { fecha_hasta, observaciones }) {
  const { rows } = await pool.query(
    `UPDATE sld_ausentismo SET fecha_hasta = $4, observaciones = $5
     WHERE empleado = $1 AND motivo = $2 AND fecha_desde = $3
     RETURNING empleado, motivo, fecha_desde, fecha_hasta, observaciones`,
    [empleado, motivo, fechaDesde, fecha_hasta ?? null, observaciones ?? null]
  );
  return rows[0] ?? null;
}

async function remove(empleado, motivo, fechaDesde) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_ausentismo WHERE empleado = $1 AND motivo = $2 AND fecha_desde = $3',
    [empleado, motivo, fechaDesde]
  );
  return rowCount > 0;
}

module.exports = { list, create, update, remove };
