const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// Nunca se devuelve password_hash por la API.
const SELECT_COLS = 'id, usuario, nombre, activo, ultimo_login, creado';

async function list() {
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sys_usuario ORDER BY usuario`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sys_usuario WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// Uso interno de auth.login — sí incluye el hash.
async function getByUsuario(usuario) {
  const { rows } = await pool.query(
    'SELECT id, usuario, nombre, password_hash, activo FROM sys_usuario WHERE usuario = $1',
    [usuario]
  );
  return rows[0] ?? null;
}

async function create({ usuario, nombre, password, activo }) {
  const hash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    `INSERT INTO sys_usuario (usuario, nombre, password_hash, activo)
     VALUES ($1, $2, $3, $4) RETURNING ${SELECT_COLS}`,
    [usuario, nombre, hash, activo ?? true]
  );
  return rows[0];
}

async function update(id, { usuario, nombre, password, activo }) {
  const cols = [];
  const vals = [];
  function set(col, val) { vals.push(val); cols.push(`${col} = $${vals.length}`); }

  if (usuario !== undefined) set('usuario', usuario);
  if (nombre !== undefined) set('nombre', nombre);
  if (activo !== undefined) set('activo', activo);
  if (password) set('password_hash', bcrypt.hashSync(password, 10));

  if (!cols.length) return getById(id);
  vals.push(id);
  const { rows } = await pool.query(
    `UPDATE sys_usuario SET ${cols.join(', ')} WHERE id = $${vals.length} RETURNING ${SELECT_COLS}`,
    vals
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sys_usuario WHERE id = $1', [id]);
  return rowCount > 0;
}

async function touchLogin(id) {
  await pool.query('UPDATE sys_usuario SET ultimo_login = now() WHERE id = $1', [id]);
}

module.exports = { list, getById, getByUsuario, create, update, remove, touchLogin };
