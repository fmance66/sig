const pool = require('../config/db');

// Columnas que devuelve la API (excluye BYTEA baja/logo y mail_password)
const SELECT_COLS = `
  id, sistema, version, razon_social, nombre_comercial, cuit, numero_ib,
  condicion_iva, actividad, inicio, direccion, localidad, provincia, cpa,
  zona, telefono, email, webpage, observaciones,
  mail_address, mail_account, mail_username, smtp_host, smtp_port,
  empresa, login, cloud, workspace, cloudspace, orden
`;

// Columnas de tipo numérico — string vacío se convierte a null
const INTEGER_COLS = new Set(['smtp_port', 'orden']);

function normalize(col, val) {
  if (val === '' || val === undefined) return null;
  if (INTEGER_COLS.has(col) && val !== null) { const n = Number(val); return Number.isNaN(n) ? null : n; }
  return val;
}

// Columnas que acepta el body (no incluye id en update, ni campos BYTEA)
const MUTABLE = [
  'sistema','version','razon_social','nombre_comercial','cuit','numero_ib',
  'condicion_iva','actividad','inicio','direccion','localidad','provincia','cpa',
  'zona','telefono','email','webpage','observaciones',
  'mail_address','mail_account','mail_username','mail_password','smtp_host','smtp_port',
  'empresa','login','cloud','workspace','cloudspace','orden',
];

async function list() {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM sys_empresa ORDER BY orden NULLS LAST, id`
  );
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(
    `SELECT ${SELECT_COLS} FROM sys_empresa WHERE id = $1`, [id]
  );
  return rows[0] ?? null;
}

async function create(data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  const vals = cols.map(c => normalize(c, data[c]));
  const ph   = cols.map((_, i) => `$${i + 1}`);
  const { rows } = await pool.query(
    `INSERT INTO sys_empresa (${cols.join(',')}) VALUES (${ph.join(',')}) RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0];
}

async function update(id, data) {
  const cols = MUTABLE.filter(c => data[c] !== undefined);
  if (!cols.length) return getById(id);
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = [id, ...cols.map(c => normalize(c, data[c]))];
  const { rows } = await pool.query(
    `UPDATE sys_empresa SET ${sets.join(',')} WHERE id = $1 RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sys_empresa WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getLogo(id) {
  const { rows } = await pool.query('SELECT logo FROM sys_empresa WHERE id = $1', [id]);
  return rows[0]?.logo ?? null;
}

async function setLogo(id, buffer) {
  const { rowCount } = await pool.query('UPDATE sys_empresa SET logo = $1 WHERE id = $2', [buffer, id]);
  return rowCount > 0;
}

async function removeLogo(id) {
  const { rowCount } = await pool.query('UPDATE sys_empresa SET logo = NULL WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { list, getById, create, update, remove, getLogo, setLogo, removeLogo };
