const pool = require('../config/db');

async function list({ campo, fechaDesde, fechaHasta } = {}) {
  const { rows } = await pool.query(
    `SELECT h.campo, h.fecha_desde, h.fecha_hasta, h.valor,
            c.descripcion AS campo_desc
     FROM sld_historial h
     LEFT JOIN sld_campo_historial c ON c.id = h.campo
     WHERE ($1::text IS NULL OR h.campo = $1)
       AND ($2::date IS NULL OR h.fecha_desde >= $2)
       AND ($3::date IS NULL OR h.fecha_desde <= $3)
     ORDER BY h.fecha_desde DESC, h.campo`,
    [campo || null, fechaDesde || null, fechaHasta || null]
  );
  return rows;
}

async function create(data) {
  const { rows } = await pool.query(
    `INSERT INTO sld_historial (campo, fecha_desde, fecha_hasta, valor)
     VALUES ($1, $2, $3, $4)
     RETURNING campo, fecha_desde, fecha_hasta, valor`,
    [data.campo, data.fecha_desde, data.fecha_hasta ?? null, data.valor ?? null]
  );
  return rows[0];
}

async function update(campo, fechaDesde, { fecha_hasta, valor }) {
  const { rows } = await pool.query(
    `UPDATE sld_historial SET fecha_hasta = $3, valor = $4
     WHERE campo = $1 AND fecha_desde = $2
     RETURNING campo, fecha_desde, fecha_hasta, valor`,
    [campo, fechaDesde, fecha_hasta ?? null, valor ?? null]
  );
  return rows[0] ?? null;
}

async function remove(campo, fechaDesde) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_historial WHERE campo = $1 AND fecha_desde = $2',
    [campo, fechaDesde]
  );
  return rowCount > 0;
}

async function removeMasivo({ campo, fechaDesde } = {}) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_historial h
     WHERE ($1::text IS NULL OR h.campo = $1)
       AND ($2::date IS NULL OR h.fecha_desde = $2)`,
    [campo || null, fechaDesde || null]
  );
  return rowCount;
}

module.exports = { list, create, update, remove, removeMasivo };
