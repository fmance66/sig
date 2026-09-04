const pool = require('../config/db');

async function list({ empleado, campo, fechaDesde, fechaHasta, empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT h.empleado, h.campo, h.fecha_desde, h.fecha_hasta, h.valor,
            c.descripcion AS campo_desc,
            e.legajo, e.apellido, e.nombre
     FROM sld_historial_empleado h
     LEFT JOIN sld_campo_historial c ON c.id = h.campo
     LEFT JOIN sld_empleado e ON e.id = h.empleado
     WHERE ($1::integer IS NULL OR h.empleado = $1)
       AND ($2::text IS NULL OR h.campo = $2)
       AND ($3::date IS NULL OR h.fecha_desde >= $3)
       AND ($4::date IS NULL OR h.fecha_desde <= $4)
       AND ($5::integer IS NULL OR e.empresa = $5)
     ORDER BY h.fecha_desde DESC, e.apellido, e.nombre`,
    [empleado || null, campo || null, fechaDesde || null, fechaHasta || null, empresa ? Number(empresa) : null]
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

async function update(empleado, campo, fechaDesde, { fecha_hasta, valor }) {
  const { rows } = await pool.query(
    `UPDATE sld_historial_empleado SET fecha_hasta = $4, valor = $5
     WHERE empleado = $1 AND campo = $2 AND fecha_desde = $3
     RETURNING empleado, campo, fecha_desde, fecha_hasta, valor`,
    [empleado, campo, fechaDesde, fecha_hasta ?? null, valor ?? null]
  );
  return rows[0] ?? null;
}

async function remove(empleado, campo, fechaDesde) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_historial_empleado WHERE empleado = $1 AND campo = $2 AND fecha_desde = $3',
    [empleado, campo, fechaDesde]
  );
  return rowCount > 0;
}

async function removeMasivo({ empleado, campo, fechaDesde, empresa } = {}) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_historial_empleado h
     USING sld_empleado e
     WHERE h.empleado = e.id
       AND ($1::integer IS NULL OR h.empleado = $1)
       AND ($2::text IS NULL OR h.campo = $2)
       AND ($3::date IS NULL OR h.fecha_desde = $3)
       AND ($4::integer IS NULL OR e.empresa = $4)`,
    [empleado || null, campo || null, fechaDesde || null, empresa ? Number(empresa) : null]
  );
  return rowCount;
}

module.exports = { list, create, update, remove, removeMasivo };
