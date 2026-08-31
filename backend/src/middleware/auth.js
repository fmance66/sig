const pool = require('../config/db');

const ACCION_POR_METODO = { GET: 'ver', POST: 'crear', PUT: 'editar', PATCH: 'editar', DELETE: 'eliminar' };

function requireAuth(req, res, next) {
  if (!req.session?.usuarioId) {
    return res.status(401).json({ estado: 'error', mensaje: 'Debe iniciar sesión' });
  }
  next();
}

function requireModulo(moduloId) {
  return async function (req, res, next) {
    if (!req.session?.usuarioId) {
      return res.status(401).json({ estado: 'error', mensaje: 'Debe iniciar sesión' });
    }
    const accion = ACCION_POR_METODO[req.method] || 'ver';
    try {
      const { rows } = await pool.query(
        `SELECT bool_or(p.${accion}) AS permitido
           FROM sys_permiso p
           JOIN sys_usuario_grupo ug ON ug.grupo = p.grupo
          WHERE ug.usuario = $1 AND p.modulo = $2`,
        [req.session.usuarioId, moduloId]
      );
      if (!rows[0]?.permitido) {
        return res.status(403).json({ estado: 'error', mensaje: 'No tiene permiso para esta acción' });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: 'Error al verificar permisos' });
    }
  };
}

// Variante para rutas de lectura ampliamente compartida (ej. /empresas: el
// selector de empresa lo usa cualquier usuario logueado sin importar el
// módulo al que esté yendo) — el GET solo exige sesión (ya la exige el gate
// global), y las escrituras siguen requiriendo el permiso del módulo.
function requireModuloEscritura(moduloId) {
  const gate = requireModulo(moduloId);
  return (req, res, next) => (req.method === 'GET' ? next() : gate(req, res, next));
}

module.exports = { requireAuth, requireModulo, requireModuloEscritura };
