const pool = require('../config/db');

async function list({ periodo, legajo, empresa, convenio, categoria, grupo, estado, columna } = {}) {
  const col = columna === 'AUXILIAR' ? 'AUXILIAR' : 'CONTRIBUCION';
  const { rows } = await pool.query(
    `SELECT r.periodo, r.empleado, r.numero, r.fecha_recibo, e.legajo, e.apellido, e.nombre,
            r.contribucion, r.costo_laboral,
            COALESCE((SELECT SUM(rc.importe) FROM sld_recibo_concepto rc JOIN sld_concepto c ON c.id = rc.concepto
                      WHERE rc.periodo = r.periodo AND rc.empleado = r.empleado AND rc.numero = r.numero AND c.columna = $8), 0) AS total
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     WHERE ($1::text IS NULL OR r.periodo ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%')
       AND ($3::integer IS NULL OR e.empresa = $3)
       AND ($4::text IS NULL OR e.convenio = $4)
       AND ($5::text IS NULL OR e.categoria = $5)
       AND ($6::text IS NULL OR e.grupo = $6)
       AND ($7::text IS NULL OR l.estado = $7)
     ORDER BY r.periodo, e.apellido, e.nombre`,
    [periodo || null, legajo || null, empresa ? Number(empresa) : null, convenio || null,
      categoria || null, grupo || null, estado || null, col]
  );
  return rows;
}

async function detalle(periodo, empleado, numero, columna) {
  const col = columna === 'AUXILIAR' ? 'AUXILIAR' : 'CONTRIBUCION';
  const { rows } = await pool.query(
    `SELECT rc.concepto, c.descripcion, rc.unidad, rc.importe
     FROM sld_recibo_concepto rc
     JOIN sld_concepto c ON c.id = rc.concepto
     WHERE rc.periodo = $1 AND rc.empleado = $2 AND rc.numero = $3 AND c.columna = $4
     ORDER BY c.orden NULLS LAST, c.id`,
    [periodo, empleado, numero, col]
  );
  return rows;
}

module.exports = { list, detalle };
