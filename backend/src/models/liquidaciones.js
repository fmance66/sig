const pool = require('../config/db');

const COLS = `
  periodo, tipo, estado, fecha, fecha_desde, fecha_hasta, descripcion, concepto_predef,
  fecha_pago, lugar_pago, fecha_deposito, periodo_deposito, banco_deposito, orden
`;

const MUTABLE = [
  'tipo', 'estado', 'fecha', 'fecha_desde', 'fecha_hasta', 'descripcion', 'concepto_predef',
  'fecha_pago', 'lugar_pago', 'fecha_deposito', 'periodo_deposito', 'banco_deposito', 'orden',
];

const toDbValue = v => (v === '' ? null : v);

async function list({ periodo, estado, fechaDesde, fechaHasta, descripcion, empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_liquidacion l
     WHERE ($1::text IS NULL OR periodo ILIKE '%'||$1||'%')
       AND ($2::text IS NULL OR estado = $2)
       AND ($3::date IS NULL OR fecha >= $3)
       AND ($4::date IS NULL OR fecha <= $4)
       AND ($5::text IS NULL OR descripcion ILIKE '%'||$5||'%')
       AND ($6::integer IS NULL OR EXISTS (
             SELECT 1 FROM sld_recibo r JOIN sld_empleado e ON e.id = r.empleado
             WHERE r.periodo = l.periodo AND e.empresa = $6))
     ORDER BY orden NULLS LAST, periodo`,
    [periodo || null, estado || null, fechaDesde || null, fechaHasta || null, descripcion || null,
      empresa ? Number(empresa) : null]
  );
  return rows;
}

async function getByPeriodo(periodo) {
  const { rows } = await pool.query(`SELECT ${COLS} FROM sld_liquidacion WHERE periodo = $1`, [periodo]);
  return rows[0] ?? null;
}

async function nextOrden() {
  const { rows } = await pool.query('SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM sld_liquidacion');
  return rows[0].siguiente;
}

async function create(data) {
  const orden = data.orden === undefined || data.orden === '' ? await nextOrden() : data.orden;
  const cols = MUTABLE.filter(c => data[c] !== undefined || c === 'orden');
  const vals = cols.map(c => (c === 'orden' ? orden : toDbValue(data[c])));
  const allCols = ['periodo', ...cols];
  const allVals = [data.periodo, ...vals];
  const ph = allCols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sld_liquidacion (${allCols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${COLS}`,
    allVals
  );
  return rows[0];
}

async function update(periodo, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getByPeriodo(periodo);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = [periodo, ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_liquidacion SET ${sets.join(',')} WHERE periodo = $1 RETURNING ${COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(periodo) {
  const { rowCount } = await pool.query('DELETE FROM sld_liquidacion WHERE periodo = $1', [periodo]);
  return rowCount > 0;
}

module.exports = { list, getByPeriodo, create, update, remove };
