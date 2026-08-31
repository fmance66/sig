const Grupo = require('../models/grupos');

async function list(req, res) {
  try {
    res.json({ estado: 'ok', resultado: await Grupo.list() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener grupos' });
  }
}

async function getOne(req, res) {
  try {
    const data = await Grupo.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Grupo no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el grupo' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.nombre) return res.status(400).json({ estado: 'error', mensaje: 'nombre es requerido' });
    res.status(201).json({ estado: 'ok', resultado: await Grupo.create(req.body) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un grupo con ese nombre' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el grupo' });
  }
}

async function update(req, res) {
  try {
    const data = await Grupo.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Grupo no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un grupo con ese nombre' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el grupo' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Grupo.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Grupo no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Grupo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el grupo' });
  }
}

async function listUsuarios(req, res) {
  try {
    res.json({ estado: 'ok', resultado: await Grupo.getUsuarios(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los usuarios del grupo' });
  }
}

async function setUsuarios(req, res) {
  try {
    const ids = Array.isArray(req.body.usuarioIds) ? req.body.usuarioIds : [];
    await Grupo.setUsuarios(req.params.id, ids);
    res.json({ estado: 'ok', mensaje: 'Usuarios del grupo actualizados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar los usuarios del grupo' });
  }
}

async function listPermisos(req, res) {
  try {
    res.json({ estado: 'ok', resultado: await Grupo.getPermisos(req.params.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los permisos del grupo' });
  }
}

async function setPermisos(req, res) {
  try {
    const permisos = Array.isArray(req.body.permisos) ? req.body.permisos : [];
    await Grupo.setPermisos(req.params.id, permisos);
    res.json({ estado: 'ok', mensaje: 'Permisos del grupo actualizados' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar los permisos del grupo' });
  }
}

module.exports = { list, getOne, create, update, remove, listUsuarios, setUsuarios, listPermisos, setPermisos };
