const pool = require('../config/db');
const { calcularRecibo } = require('../services/reciboCalculo');

async function matchingKeys({ periodo, fecha, legajo, empresa, convenio, categoria, grupo, estado } = {}) {
  const { rows } = await pool.query(
    `SELECT r.periodo, r.empleado, r.numero
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo
     WHERE ($1::text IS NULL OR r.periodo ILIKE '%'||$1||'%')
       AND ($2::date IS NULL OR r.fecha_recibo = $2)
       AND ($3::text IS NULL OR e.legajo ILIKE '%'||$3||'%')
       AND ($4::integer IS NULL OR e.empresa = $4)
       AND ($5::text IS NULL OR e.convenio = $5)
       AND ($6::text IS NULL OR e.categoria = $6)
       AND ($7::text IS NULL OR e.grupo = $7)
       AND ($8::text IS NULL OR l.estado = $8)`,
    [periodo || null, fecha || null, legajo || null, empresa ? Number(empresa) : null,
      convenio || null, categoria || null, grupo || null, estado || null]
  );
  return rows;
}

async function list(filtro) {
  const keys = await matchingKeys(filtro);
  if (!keys.length) return [];
  const { rows } = await pool.query(
    `SELECT r.periodo, r.empleado, r.numero, r.fecha_recibo, e.legajo, e.apellido, e.nombre,
            r.sueldo_neto, r.sueldo_bruto
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     WHERE (r.periodo, r.empleado, r.numero) IN (${keys.map((_, i) => `($${i * 3 + 1},$${i * 3 + 2},$${i * 3 + 3})`).join(',')})
     ORDER BY e.legajo`,
    keys.flatMap(k => [k.periodo, k.empleado, k.numero])
  );
  return rows;
}

async function recalcular(filtro) {
  const keys = await matchingKeys(filtro);
  const resultados = [];
  for (const k of keys) {
    try {
      const r = await calcularRecibo(k.periodo, k.empleado, k.numero);
      if (r) resultados.push({ periodo: k.periodo, empleado: k.empleado, numero: k.numero, sueldo_neto: r.recibo.sueldo_neto, sueldo_bruto: r.recibo.sueldo_bruto });
    } catch (err) {
      console.error(err);
    }
  }
  return resultados;
}

async function adicionarConcepto(filtro, { concepto, descripcion, unidad_manual, importe_manual }) {
  const keys = await matchingKeys(filtro);
  let aplicados = 0;
  for (const k of keys) {
    await pool.query(
      `INSERT INTO sld_recibo_concepto (periodo, empleado, numero, concepto, descripcion, unidad_manual, importe_manual, unidad, importe, condicion)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7,TRUE)
       ON CONFLICT (periodo, empleado, numero, concepto) DO UPDATE
         SET unidad_manual = EXCLUDED.unidad_manual, importe_manual = EXCLUDED.importe_manual`,
      [k.periodo, k.empleado, k.numero, concepto, descripcion || null,
        unidad_manual === '' || unidad_manual === undefined ? null : unidad_manual,
        importe_manual === '' || importe_manual === undefined ? null : importe_manual]
    );
    await calcularRecibo(k.periodo, k.empleado, k.numero);
    aplicados++;
  }
  return aplicados;
}

module.exports = { list, recalcular, adicionarConcepto };
