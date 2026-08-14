const pool = require('../config/db');

async function list({ empleado, tipoNovedad, fecha } = {}) {
  const { rows } = await pool.query(
    `SELECT n.empleado, n.tipo_novedad, n.fecha, n.value,
            t.descripcion AS tipo_novedad_desc,
            e.legajo, e.apellido, e.nombre
     FROM sld_novedad n
     LEFT JOIN sld_tipo_novedad t ON t.id = n.tipo_novedad
     LEFT JOIN sld_empleado e ON e.id = n.empleado
     WHERE ($1::integer IS NULL OR n.empleado = $1)
       AND ($2::text IS NULL OR n.tipo_novedad = $2)
       AND ($3::date IS NULL OR n.fecha = $3)
     ORDER BY n.fecha DESC, e.apellido, e.nombre`,
    [empleado || null, tipoNovedad || null, fecha || null]
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

async function update(empleado, tipoNovedad, fecha, value) {
  const { rows } = await pool.query(
    `UPDATE sld_novedad SET value = $4
     WHERE empleado = $1 AND tipo_novedad = $2 AND fecha = $3
     RETURNING empleado, tipo_novedad, fecha, value`,
    [empleado, tipoNovedad, fecha, value ?? null]
  );
  return rows[0] ?? null;
}

async function remove(empleado, tipo_novedad, fecha) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_novedad WHERE empleado = $1 AND tipo_novedad = $2 AND fecha = $3',
    [empleado, tipo_novedad, fecha]
  );
  return rowCount > 0;
}

async function removeMasivo({ empleado, tipoNovedad, fecha } = {}) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_novedad n
     WHERE ($1::integer IS NULL OR n.empleado = $1)
       AND ($2::text IS NULL OR n.tipo_novedad = $2)
       AND ($3::date IS NULL OR n.fecha = $3)`,
    [empleado || null, tipoNovedad || null, fecha || null]
  );
  return rowCount;
}

async function matrizGet(fecha, { empleado, tipoNovedad } = {}) {
  const { rows } = await pool.query(
    `SELECT e.id AS empleado, e.legajo, e.apellido, e.nombre,
            t.id AS tipo_novedad, t.descripcion AS tipo_novedad_desc,
            $1::date AS fecha, n.value
     FROM sld_empleado e
     CROSS JOIN sld_tipo_novedad t
     LEFT JOIN sld_novedad n
       ON n.empleado = e.id AND n.tipo_novedad = t.id AND n.fecha = $1
     WHERE ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%' OR e.apellido ILIKE '%'||$2||'%' OR e.nombre ILIKE '%'||$2||'%')
       AND ($3::text IS NULL OR t.id ILIKE '%'||$3||'%' OR t.descripcion ILIKE '%'||$3||'%')
     ORDER BY e.apellido, e.nombre, t.orden NULLS LAST, t.id`,
    [fecha, empleado || null, tipoNovedad || null]
  );
  return rows;
}

async function matrizSave(fecha, filas) {
  let guardados = 0;
  for (const fila of filas) {
    const value = fila.value === '' || fila.value === undefined ? null : fila.value;
    if (value === null) {
      await pool.query(
        'DELETE FROM sld_novedad WHERE empleado = $1 AND tipo_novedad = $2 AND fecha = $3',
        [fila.empleado, fila.tipo_novedad, fecha]
      );
    } else {
      await pool.query(
        `INSERT INTO sld_novedad (empleado, tipo_novedad, fecha, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (empleado, tipo_novedad, fecha) DO UPDATE SET value = EXCLUDED.value`,
        [fila.empleado, fila.tipo_novedad, fecha, value]
      );
      guardados++;
    }
  }
  return guardados;
}

module.exports = { list, create, update, remove, removeMasivo, matrizGet, matrizSave };
