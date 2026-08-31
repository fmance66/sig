const Usuario = require('../models/usuarios');

async function list(req, res) {
  try {
    res.json({ estado: 'ok', resultado: await Usuario.list() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener usuarios' });
  }
}

async function getOne(req, res) {
  try {
    const data = await Usuario.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el usuario' });
  }
}

async function create(req, res) {
  try {
    const { usuario, nombre, password } = req.body;
    if (!usuario || !nombre || !password) {
      return res.status(400).json({ estado: 'error', mensaje: 'usuario, nombre y password son requeridos' });
    }
    res.status(201).json({ estado: 'ok', resultado: await Usuario.create(req.body) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un usuario con ese nombre' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el usuario' });
  }
}

async function update(req, res) {
  try {
    const data = await Usuario.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un usuario con ese nombre' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el usuario' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Usuario.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Usuario no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Usuario eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el usuario' });
  }
}

module.exports = { list, getOne, create, update, remove };
