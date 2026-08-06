const pool = require('../config/db');

const COLS = `
  empleado, situacion, condicion, actividad, modalidad, incapacidad, codigo_zona,
  situacion_revista_1, dia_inicio_1, situacion_revista_2, dia_inicio_2,
  situacion_revista_3, dia_inicio_3
`;

const MUTABLE = [
  'situacion', 'condicion', 'actividad', 'modalidad', 'incapacidad', 'codigo_zona',
  'situacion_revista_1', 'dia_inicio_1', 'situacion_revista_2', 'dia_inicio_2',
  'situacion_revista_3', 'dia_inicio_3',
];

async function getByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM sld_empleado_afip WHERE empleado = $1`, [empleado]
  );
  return rows[0] ?? null;
}

async function upsert(empleado, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  const vals = cols.map(c => (data[c] === '' ? null : data[c]));
  const insertCols = ['empleado', ...cols];
  const insertVals = [empleado, ...vals];
  const ph = insertCols.map((_, i) => `$${i + 1}`);
  const updateSet = cols.map(c => `${c} = EXCLUDED.${c}`).join(',');
  const { rows } = await pool.query(
    `INSERT INTO sld_empleado_afip (${insertCols.join(',')}) VALUES (${ph.join(',')})
     ON CONFLICT (empleado) DO UPDATE SET ${updateSet || 'empleado = EXCLUDED.empleado'}
     RETURNING ${COLS}`,
    insertVals
  );
  return rows[0];
}

module.exports = { getByEmpleado, upsert };
