const pool = require('../config/db');

const COLS = `
  empleado, id, parentesco, apellido, nombre, fecha_alta, cuil, sexo,
  fecha_nacimiento, nacionalidad, tipo_documento, numero_documento,
  estudio, estado_academico, anio_academico, discapacidad, adopcion,
  adherente, deducible, porcentaje
`;

const MUTABLE = [
  'parentesco', 'apellido', 'nombre', 'fecha_alta', 'cuil', 'sexo',
  'fecha_nacimiento', 'nacionalidad', 'tipo_documento', 'numero_documento',
  'estudio', 'estado_academico', 'anio_academico', 'discapacidad', 'adopcion',
  'adherente', 'deducible', 'porcentaje',
];

async function listByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_familiar WHERE empleado = $1 ORDER BY id::int NULLS LAST`,
    [empleado]
  );
  return rows;
}

async function create(empleado, data) {
  const { rows: nextIdRows } = await pool.query(
    `SELECT COALESCE(MAX(id::int), 0) + 1 AS next_id
     FROM sld_familiar WHERE empleado = $1 AND id ~ '^[0-9]+$'`,
    [empleado]
  );
  const id = String(nextIdRows[0].next_id);

  const cols = MUTABLE.filter(c => data[c] !== undefined && data[c] !== '');
  const vals = cols.map(c => data[c]);
  const insertCols = ['empleado', 'id', ...cols];
  const insertVals = [empleado, id, ...vals];
  const ph = insertCols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sld_familiar (${insertCols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${COLS}`,
    insertVals
  );
  return rows[0];
}

async function update(empleado, id, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) {
    const { rows } = await pool.query(
      `SELECT ${COLS} FROM sld_familiar WHERE empleado = $1 AND id = $2`, [empleado, id]
    );
    return rows[0] ?? null;
  }
  const sets = cols.map((c, i) => `${c} = $${i + 3}`);
  const vals = [empleado, id, ...cols.map(c => (data[c] === '' ? null : data[c]))];
  const { rows } = await pool.query(
    `UPDATE sld_familiar SET ${sets.join(',')} WHERE empleado = $1 AND id = $2 RETURNING ${COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(empleado, id) {
  const { rowCount } = await pool.query(
    'DELETE FROM sld_familiar WHERE empleado = $1 AND id = $2', [empleado, id]
  );
  return rowCount > 0;
}

module.exports = { listByEmpleado, create, update, remove };
