const pool = require('../config/db');

async function list() {
  const { rows } = await pool.query(
    `SELECT s.sid, u.id AS usuario_id, u.usuario, u.nombre, s.expire
       FROM sys_sesion s
       LEFT JOIN sys_usuario u ON u.id = (s.sess->>'usuarioId')::int
      ORDER BY s.expire DESC`
  );
  return rows;
}

async function remove(sid) {
  const { rowCount } = await pool.query('DELETE FROM sys_sesion WHERE sid = $1', [sid]);
  return rowCount > 0;
}

module.exports = { list, remove };
