const pool = require('../config/db');

const HEADER_COLS = `
  r.periodo, r.empleado, r.numero, r.periodo_recibo, r.fecha_recibo, r.fecha_pago,
  r.remunerativo, r.no_remunerativo, r.descuento, r.sueldo_neto, r.sueldo_bruto,
  r.contribucion, r.costo_laboral, r.moneda, r.cotizacion, r.proyecto,
  r.observaciones, r.mail, r.visible, r.orden
`;

const HEADER_MUTABLE = [
  'periodo_recibo', 'fecha_recibo', 'fecha_pago', 'moneda', 'cotizacion',
  'proyecto', 'observaciones', 'mail', 'visible', 'orden',
];

const toDbValue = v => (v === '' ? null : v);

async function list({ periodo, legajo, empresa, convenio, categoria, grupo, estado } = {}) {
  const { rows } = await pool.query(
    `SELECT ${HEADER_COLS}, e.legajo, e.apellido, e.nombre, e.convenio, e.categoria, e.grupo
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo AND l.empresa = r.empresa
     WHERE ($1::text IS NULL OR r.periodo = $1)
       AND ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%')
       AND ($3::integer IS NULL OR e.empresa = $3)
       AND ($4::text IS NULL OR e.convenio = $4)
       AND ($5::text IS NULL OR e.categoria = $5)
       AND ($6::text IS NULL OR e.grupo = $6)
       AND ($7::text IS NULL OR l.estado = $7)
     ORDER BY r.orden NULLS LAST, r.periodo, e.apellido, e.nombre`,
    [periodo || null, legajo || null, empresa ? Number(empresa) : null,
      convenio || null, categoria || null, grupo || null, estado || null]
  );
  return rows;
}

// Columnas extra (empresa/convenio/categoría/obra social/liquidación) usadas por el
// intérprete de diseño del PDF (backend/src/pdf/reciboInterprete.js) — no se usan en la
// grilla JSON de RecibosSueldoPage, solo al armar el recibo para el PDF.
const HEADER_DISENO_COLS = `
  e.empresa AS empresa_id,
  e.fecha_ingreso, e.fecha_egreso, e.fecha_antiguedad, e.fecha_nacimiento, e.provincia, e.estado_civil, e.jornada,
  e.direccion AS empleado_direccion, e.localidad AS empleado_localidad,
  e.numero_documento AS empleado_numero_documento, e.lugar_trabajo AS empleado_lugar_trabajo,
  e.sueldo, e.banco, e.cuenta, e.cbu,
  cv.descripcion AS convenio_desc, cat.descripcion AS categoria_desc, os.descripcion AS obra_social_desc,
  proy.descripcion AS empleado_centro_costo,
  l.fecha_pago AS liq_fecha_pago, l.lugar_pago AS liq_lugar_pago,
  l.fecha_deposito AS liq_fecha_deposito, l.periodo_deposito AS liq_periodo_deposito,
  l.banco_deposito AS liq_banco_deposito,
  emp.razon_social AS empresa_razon_social, emp.cuit AS empresa_cuit, emp.actividad AS empresa_actividad,
  emp.direccion AS empresa_direccion, emp.localidad AS empresa_localidad,
  emp.provincia AS empresa_provincia, emp.cpa AS empresa_cpa, emp.logo AS empresa_logo
`;

async function getHeader(periodo, empleado, numero) {
  const { rows } = await pool.query(
    `SELECT ${HEADER_COLS}, e.legajo, e.apellido, e.nombre, e.cuil, e.convenio, e.categoria, e.tarea,
            ${HEADER_DISENO_COLS}
     FROM sld_recibo r
     JOIN sld_empleado e ON e.id = r.empleado
     LEFT JOIN sld_liquidacion l ON l.periodo = r.periodo AND l.empresa = r.empresa
     LEFT JOIN sld_convenio cv ON cv.id = e.convenio
     LEFT JOIN sld_categoria cat ON cat.convenio = e.convenio AND cat.id = e.categoria
     LEFT JOIN sld_obra_social os ON os.id = e.obra_social
     LEFT JOIN bas_proyecto proy ON proy.id = e.proyecto
     LEFT JOIN sys_empresa emp ON emp.id = e.empresa
     WHERE r.periodo = $1 AND r.empleado = $2 AND r.numero = $3`,
    [periodo, empleado, numero]
  );
  return rows[0] ?? null;
}

async function listConceptos(periodo, empleado, numero) {
  const { rows } = await pool.query(
    `SELECT rc.periodo, rc.empleado, rc.numero, rc.concepto, rc.descripcion,
            rc.unidad_manual, rc.importe_manual, rc.unidad, rc.importe, rc.unitario,
            rc.condicion, rc.warning, rc.error, rc.message, rc.orden,
            c.descripcion AS concepto_desc, c.columna, c.simbolo_unidad, c.decimales_unidad,
            c.unidad_visible, c.orden AS concepto_orden
     FROM sld_recibo_concepto rc
     JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
     WHERE rc.periodo = $1 AND rc.empleado = $2 AND rc.numero = $3
     ORDER BY rc.orden NULLS LAST, c.orden NULLS LAST, c.id`,
    [periodo, empleado, numero]
  );
  return rows;
}

async function nextNumero(periodo, empleado) {
  const { rows } = await pool.query(
    'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM sld_recibo WHERE periodo = $1 AND empleado = $2',
    [periodo, empleado]
  );
  return rows[0].siguiente;
}

async function createHeader(data) {
  const numero = data.numero || await nextNumero(data.periodo, data.empleado);
  const cols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  const allCols = ['periodo', 'empleado', 'numero', 'empresa', ...cols];
  const ph = ['$1', '$2', '$3', '(SELECT empresa FROM sld_empleado WHERE id = $2)', ...cols.map((_, i) => `$${i + 4}`)];
  const allVals = [data.periodo, data.empleado, numero, ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `INSERT INTO sld_recibo (${allCols.join(',')}) VALUES (${ph.join(',')}) RETURNING periodo, empleado, numero`,
    allVals
  );
  return getHeader(rows[0].periodo, rows[0].empleado, rows[0].numero);
}

async function updateHeader(periodo, empleado, numero, data) {
  const cols = HEADER_MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getHeader(periodo, empleado, numero);
  const sets = cols.map((c, i) => `${c} = $${i + 4}`);
  const vals = [periodo, empleado, numero, ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_recibo SET ${sets.join(',')} WHERE periodo = $1 AND empleado = $2 AND numero = $3 RETURNING periodo`,
    vals
  );
  if (!rows.length) return null;
  return getHeader(periodo, empleado, numero);
}

async function removeHeader(periodo, empleado, numero) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_recibo WHERE periodo = $1 AND empleado = $2 AND numero = $3',
    [periodo, empleado, numero]
  );
  return rowCount > 0;
}

async function removeMasivo({ periodo, legajo, empresa, convenio, categoria, grupo }) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_recibo r
     USING sld_empleado e
     WHERE r.empleado = e.id
       AND ($1::text IS NULL OR r.periodo = $1)
       AND ($2::text IS NULL OR e.legajo ILIKE '%'||$2||'%')
       AND ($3::integer IS NULL OR e.empresa = $3)
       AND ($4::text IS NULL OR e.convenio = $4)
       AND ($5::text IS NULL OR e.categoria = $5)
       AND ($6::text IS NULL OR e.grupo = $6)`,
    [periodo || null, legajo || null, empresa ? Number(empresa) : null, convenio || null, categoria || null, grupo || null]
  );
  return rowCount;
}

async function createConcepto(periodo, empleado, numero, data) {
  const unidadManual = toDbValue(data.unidad_manual);
  const importeManual = toDbValue(data.importe_manual);
  const { rows } = await pool.query(
    `INSERT INTO sld_recibo_concepto
       (periodo, empleado, numero, concepto, descripcion, unidad_manual, importe_manual,
        unidad, importe, condicion, orden, empresa)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$6,$7,TRUE,$8,(SELECT empresa FROM sld_empleado WHERE id = $2))
     RETURNING concepto`,
    [periodo, empleado, numero, data.concepto, data.descripcion || null, unidadManual, importeManual, data.orden ?? null]
  );
  return rows[0];
}

async function updateConcepto(periodo, empleado, numero, concepto, data) {
  const cols = ['descripcion', 'unidad_manual', 'importe_manual', 'orden'].filter(c => data[c] !== undefined);
  if (!cols.length) return { concepto };
  const sets = cols.map((c, i) => `${c} = $${i + 5}`);
  const vals = [periodo, empleado, numero, concepto, ...cols.map(c => toDbValue(data[c]))];
  const { rowCount } = await pool.query(
    `UPDATE sld_recibo_concepto SET ${sets.join(',')}
     WHERE periodo = $1 AND empleado = $2 AND numero = $3 AND concepto = $4`,
    vals
  );
  return rowCount > 0 ? { concepto } : null;
}

async function removeConcepto(periodo, empleado, numero, concepto) {
  const { rowCount } = await pool.query(
    `DELETE FROM sld_recibo_concepto WHERE periodo = $1 AND empleado = $2 AND numero = $3 AND concepto = $4`,
    [periodo, empleado, numero, concepto]
  );
  return rowCount > 0;
}

module.exports = {
  list, getHeader, listConceptos, createHeader, updateHeader, removeHeader, removeMasivo,
  createConcepto, updateConcepto, removeConcepto,
};
