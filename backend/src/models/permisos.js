const pool = require('../config/db');

// Un usuario puede pertenecer a varios grupos — el permiso efectivo de cada
// módulo es la unión (OR) de lo que le da cada grupo.
async function getPermisosPorUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT p.modulo,
            bool_or(p.ver) AS ver, bool_or(p.crear) AS crear,
            bool_or(p.editar) AS editar, bool_or(p.eliminar) AS eliminar
       FROM sys_permiso p
       JOIN sys_usuario_grupo ug ON ug.grupo = p.grupo
      WHERE ug.usuario = $1
      GROUP BY p.modulo`,
    [usuarioId]
  );
  const permisos = {};
  for (const row of rows) {
    permisos[row.modulo] = { ver: row.ver, crear: row.crear, editar: row.editar, eliminar: row.eliminar };
  }
  return permisos;
}

module.exports = { getPermisosPorUsuario };
