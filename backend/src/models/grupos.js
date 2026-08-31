const pool = require('../config/db');
const MODULOS = require('../constants/modulos');

const SELECT_COLS = 'id, nombre, descripcion, orden';

async function list() {
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sys_grupo ORDER BY orden NULLS LAST, id`);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query(`SELECT ${SELECT_COLS} FROM sys_grupo WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function create({ nombre, descripcion, orden }) {
  const { rows } = await pool.query(
    `INSERT INTO sys_grupo (nombre, descripcion, orden) VALUES ($1, $2, $3) RETURNING ${SELECT_COLS}`,
    [nombre, descripcion ?? null, orden ?? null]
  );
  return rows[0];
}

async function update(id, { nombre, descripcion, orden }) {
  const { rows } = await pool.query(
    `UPDATE sys_grupo SET nombre = $2, descripcion = $3, orden = $4 WHERE id = $1 RETURNING ${SELECT_COLS}`,
    [id, nombre, descripcion ?? null, orden ?? null]
  );
  return rows[0] ?? null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM sys_grupo WHERE id = $1', [id]);
  return rowCount > 0;
}

async function getUsuarios(grupoId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.usuario, u.nombre, (ug.grupo IS NOT NULL) AS asignado
       FROM sys_usuario u
       LEFT JOIN sys_usuario_grupo ug ON ug.usuario = u.id AND ug.grupo = $1
      ORDER BY u.usuario`,
    [grupoId]
  );
  return rows;
}

async function setUsuarios(grupoId, usuarioIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sys_usuario_grupo WHERE grupo = $1', [grupoId]);
    for (const usuarioId of usuarioIds) {
      await client.query('INSERT INTO sys_usuario_grupo (usuario, grupo) VALUES ($1, $2)', [usuarioId, grupoId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPermisos(grupoId) {
  const { rows } = await pool.query(
    `SELECT m.modulo,
            COALESCE(p.ver, FALSE) AS ver, COALESCE(p.crear, FALSE) AS crear,
            COALESCE(p.editar, FALSE) AS editar, COALESCE(p.eliminar, FALSE) AS eliminar
       FROM unnest($1::text[]) AS m(modulo)
       LEFT JOIN sys_permiso p ON p.grupo = $2 AND p.modulo = m.modulo`,
    [MODULOS, grupoId]
  );
  return rows;
}

async function setPermisos(grupoId, permisos) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of permisos) {
      if (!MODULOS.includes(p.modulo)) continue;
      await client.query(
        `INSERT INTO sys_permiso (grupo, modulo, ver, crear, editar, eliminar)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (grupo, modulo) DO UPDATE
           SET ver = $3, crear = $4, editar = $5, eliminar = $6`,
        [grupoId, p.modulo, !!p.ver, !!p.crear, !!p.editar, !!p.eliminar]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { list, getById, create, update, remove, getUsuarios, setUsuarios, getPermisos, setPermisos };
