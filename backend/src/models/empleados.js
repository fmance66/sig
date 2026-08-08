const pool = require('../config/db');

// Campos para listado (sin foto BYTEA, sin campos voluminosos)
const LIST_COLS = `
  e.id, e.legajo, e.apellido, e.nombre, e.cuil, e.estado, e.fecha_ingreso, e.fecha_egreso,
  e.sexo, e.empresa, e.convenio, e.categoria, e.sueldo, e.liquidacion,
  e.obra_social, e.sindicato, e.grupo_de_conceptos, e.orden
`;

// Campos para detalle (todo excepto foto BYTEA)
const DETAIL_COLS = `
  id, legajo, apellido, nombre, cuil, grupo, estado, tarea,
  fecha_ingreso, fecha_egreso, fecha_antiguedad, antiguedad,
  sexo, fecha_nacimiento, nacionalidad, estado_civil,
  tipo_documento, numero_documento, direccion, localidad, provincia, cpa,
  telefono, email, orden, convenio, categoria, sueldo, adicional, auxiliar,
  dias, horas, porcentaje, jornada, proporcional, liquidacion, moneda,
  vacaciones, obra_social, sindicato, proyecto, empresa, lugar_trabajo,
  banco, cuenta, cbu, grupo_de_conceptos, observaciones
`;

const MUTABLE = [
  'legajo','apellido','nombre','cuil','grupo','estado','tarea',
  'fecha_ingreso','fecha_egreso','fecha_antiguedad','antiguedad',
  'sexo','fecha_nacimiento','nacionalidad','estado_civil',
  'tipo_documento','numero_documento','direccion','localidad','provincia','cpa',
  'telefono','email','orden','convenio','categoria','sueldo','adicional','auxiliar',
  'dias','horas','porcentaje','jornada','proporcional','liquidacion','moneda',
  'vacaciones','obra_social','sindicato','proyecto','empresa','lugar_trabajo',
  'banco','cuenta','cbu','grupo_de_conceptos','observaciones',
];

async function list({ empresa, estado } = {}) {
  const activo = estado === 'activo' ? true : estado === 'inactivo' ? false : null;
  const empresaId = empresa ? Number(empresa) : null;
  const { rows } = await pool.query(
    `SELECT ${LIST_COLS}
     FROM sld_empleado e
     WHERE ($1::integer IS NULL OR e.empresa = $1)
       AND ($2::boolean IS NULL OR (lower(trim(e.estado)) = 'activo') = $2)
     ORDER BY e.orden NULLS LAST, e.apellido, e.nombre`,
    [empresaId, activo]
  );
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(
    `SELECT ${DETAIL_COLS} FROM sld_empleado WHERE id = $1`, [id]
  );
  return rows[0] ?? null;
}

// Los campos numéricos/fecha llegan como '' desde el form cuando se dejan vacíos;
// Postgres no puede castear '' a esos tipos, así que se normalizan a null.
const toDbValue = v => (v === '' ? null : v);

async function create(data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  const vals = cols.map(c => toDbValue(data[c]));
  const ph   = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sld_empleado (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${DETAIL_COLS}`,
    vals
  );
  return rows[0];
}

async function update(id, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getById(id);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = [id, ...cols.map(c => toDbValue(data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_empleado SET ${sets.join(',')} WHERE id = $1 RETURNING ${DETAIL_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sld_empleado WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, getById, create, update, remove };
