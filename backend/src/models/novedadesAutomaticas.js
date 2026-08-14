const pool = require('../config/db');

async function listEmpleadosCandidatos({ legajo, convenio, grupo, categoria, estado, provincia } = {}) {
  const { rows } = await pool.query(
    `SELECT e.id, e.legajo, e.apellido, e.nombre, e.grupo, e.tarea, e.convenio, e.categoria, e.estado, e.provincia
     FROM sld_empleado e
     WHERE ($1::text IS NULL OR e.legajo ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR e.convenio = $2)
       AND ($3::text IS NULL OR e.grupo ILIKE '%'||$3||'%')
       AND ($4::text IS NULL OR e.categoria = $4)
       AND ($5::text IS NULL OR e.estado = $5)
       AND ($6::text IS NULL OR e.provincia = $6)
     ORDER BY e.orden NULLS LAST, e.apellido, e.nombre`,
    [legajo || null, convenio || null, grupo || null, categoria || null, estado || null, provincia || null]
  );
  return rows;
}

async function generar({ tipoNovedad, fecha, value, empleados }) {
  const resumen = { creados: 0, actualizados: 0, errores: [] };
  for (const empleadoId of empleados) {
    try {
      const existeRes = await pool.query(
        'SELECT 1 FROM sld_novedad WHERE empleado = $1 AND tipo_novedad = $2 AND fecha = $3',
        [empleadoId, tipoNovedad, fecha]
      );
      const yaExistia = existeRes.rows.length > 0;
      await pool.query(
        `INSERT INTO sld_novedad (empleado, tipo_novedad, fecha, value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (empleado, tipo_novedad, fecha) DO UPDATE SET value = EXCLUDED.value`,
        [empleadoId, tipoNovedad, fecha, value ?? null]
      );
      if (yaExistia) resumen.actualizados++; else resumen.creados++;
    } catch (err) {
      resumen.errores.push({ empleado: empleadoId, mensaje: err.message });
    }
  }
  return resumen;
}

module.exports = { listEmpleadosCandidatos, generar };
