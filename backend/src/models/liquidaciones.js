const pool = require('../config/db');

const COLS = `
  periodo, empresa, tipo, estado, fecha, fecha_desde, fecha_hasta, descripcion, concepto_predef,
  fecha_pago, lugar_pago, fecha_deposito, periodo_deposito, banco_deposito, orden
`;

const MUTABLE = [
  'tipo', 'estado', 'fecha', 'fecha_desde', 'fecha_hasta', 'descripcion', 'concepto_predef',
  'fecha_pago', 'lugar_pago', 'fecha_deposito', 'periodo_deposito', 'banco_deposito', 'orden',
];

const toDbValue = v => (v === '' ? null : v);

// sld_liquidacion tiene PK compuesta (periodo, empresa): el mismo periodo calendario puede
// tener una fila por empresa, cada una con su propia fecha de pago/banco/tipo/estado.
async function list({ periodo, estado, fechaDesde, fechaHasta, descripcion, empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_liquidacion
     WHERE ($1::text IS NULL OR periodo = $1)
       AND ($2::text IS NULL OR estado = $2)
       AND ($3::date IS NULL OR fecha >= $3)
       AND ($4::date IS NULL OR fecha <= $4)
       AND ($5::text IS NULL OR descripcion ILIKE '%'||$5||'%')
       AND ($6::integer IS NULL OR empresa = $6)
     ORDER BY orden NULLS LAST, periodo`,
    [periodo || null, estado || null, fechaDesde || null, fechaHasta || null, descripcion || null,
      empresa ? Number(empresa) : null]
  );
  return rows;
}

async function getByPeriodo(periodo, empresa) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_liquidacion WHERE periodo = $1 AND empresa = $2`,
    [periodo, Number(empresa)]
  );
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
  const allCols = ['periodo', 'empresa', ...cols];
  const allVals = [data.periodo, Number(data.empresa), ...vals];
  const ph = allCols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sld_liquidacion (${allCols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${COLS}`,
    allVals
  );
  return rows[0];
}

async function update(periodo, empresa, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getByPeriodo(periodo, empresa);
  const sets = cols.map((c, i) => `${c} = $${i + 3}`);
  const vals = [periodo, Number(empresa), ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_liquidacion SET ${sets.join(',')} WHERE periodo = $1 AND empresa = $2 RETURNING ${COLS}`,
    vals
  );
  return rows[0] ?? null;
}

// El FK compuesto (periodo, empresa) con ON DELETE CASCADE hace que borrar esta fila se
// lleve puestos únicamente los recibos de esa empresa en ese período — el resto de las
// empresas que comparten el mismo periodo calendario tienen su propia fila, intacta.
async function remove(periodo, empresa) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_liquidacion WHERE periodo = $1 AND empresa = $2',
    [periodo, Number(empresa)]
  );
  return rowCount > 0;
}

module.exports = { list, getByPeriodo, create, update, remove };
