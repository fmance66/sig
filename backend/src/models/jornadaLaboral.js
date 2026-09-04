const pool = require('../config/db');

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

async function list({ empresa } = {}) {
  const { rows } = await pool.query(
    `SELECT j.empleado, j.horario, j.feriados, e.legajo, e.apellido, e.nombre
     FROM sld_jornada_laboral j
     LEFT JOIN sld_empleado e ON e.id = j.empleado
     WHERE ($1::integer IS NULL OR e.empresa = $1)
     ORDER BY e.apellido, e.nombre`,
    [empresa ? Number(empresa) : null]
  );
  return rows;
}

async function getByEmpleado(empleado) {
  const { rows } = await pool.query(
    `SELECT empleado, horario, feriados FROM sld_jornada_laboral WHERE empleado = $1`, [empleado]
  );
  if (!rows[0]) return null;
  const { rows: horarios } = await pool.query(
    `SELECT dia, entrada, salida FROM sld_horario WHERE empleado = $1`, [empleado]
  );
  const porDia = new Map(horarios.map(h => [h.dia, h]));
  return { ...rows[0], horarios: DIAS.map(dia => ({ dia, entrada: null, salida: null, ...porDia.get(dia) })) };
}

async function upsertHorarios(empleado, horarios = []) {
  await pool.query('DELETE FROM sld_horario WHERE empleado = $1', [empleado]);
  for (const h of horarios) {
    if (!h?.dia || !DIAS.includes(h.dia)) continue;
    if (!h.entrada && !h.salida) continue;
    await pool.query(
      `INSERT INTO sld_horario (empleado, dia, entrada, salida) VALUES ($1, $2, $3, $4)`,
      [empleado, h.dia, h.entrada || null, h.salida || null]
    );
  }
}

async function create(empleado, data) {
  await pool.query(
    `INSERT INTO sld_jornada_laboral (empleado, horario, feriados) VALUES ($1, $2, $3)`,
    [empleado, data.horario || null, data.feriados || null]
  );
  await upsertHorarios(empleado, data.horarios);
  return getByEmpleado(empleado);
}

async function update(empleado, data) {
  const { rows } = await pool.query(
    `UPDATE sld_jornada_laboral SET horario = $2, feriados = $3
     WHERE empleado = $1 RETURNING empleado`,
    [empleado, data.horario || null, data.feriados || null]
  );
  if (!rows[0]) return null;
  await upsertHorarios(empleado, data.horarios);
  return getByEmpleado(empleado);
}

async function remove(empleado) {
  const { rowCount } = await pool.query('DELETE FROM sld_jornada_laboral WHERE empleado = $1', [empleado]);
  return rowCount > 0;
}

module.exports = { DIAS, list, getByEmpleado, create, update, remove };
