const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarios');
const { getPermisosPorUsuario } = require('../models/permisos');

async function login(req, res) {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ estado: 'error', mensaje: 'Usuario y contraseña son requeridos' });
    }
    const row = await Usuario.getByUsuario(usuario);
    if (!row || !row.activo || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ estado: 'error', mensaje: 'Usuario o contraseña incorrectos' });
    }

    await new Promise((resolve, reject) => req.session.regenerate(err => (err ? reject(err) : resolve())));
    req.session.usuarioId = row.id;
    await Usuario.touchLogin(row.id);

    const permisos = await getPermisosPorUsuario(row.id);
    res.json({ estado: 'ok', resultado: { usuario: { id: row.id, usuario: row.usuario, nombre: row.nombre }, permisos } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al iniciar sesión' });
  }
}

async function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ estado: 'error', mensaje: 'Error al cerrar sesión' });
    }
    res.clearCookie('connect.sid');
    res.json({ estado: 'ok', mensaje: 'Sesión cerrada' });
  });
}

async function me(req, res) {
  if (!req.session?.usuarioId) {
    return res.status(401).json({ estado: 'error', mensaje: 'No hay sesión activa' });
  }
  try {
    const usuario = await Usuario.getById(req.session.usuarioId);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ estado: 'error', mensaje: 'No hay sesión activa' });
    }
    const permisos = await getPermisosPorUsuario(usuario.id);
    res.json({ estado: 'ok', resultado: { usuario: { id: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre }, permisos } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener la sesión' });
  }
}

module.exports = { login, logout, me };
