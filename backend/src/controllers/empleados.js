const Empleado = require('../models/empleados');

async function list(req, res) {
  try {
    const data = await Empleado.list({ empresa: req.query.empresa, estado: req.query.estado });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empleados' });
  }
}

async function getOne(req, res) {
  try {
    const data = await Empleado.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empleado no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empleado' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.legajo) return res.status(400).json({ estado: 'error', mensaje: 'legajo es requerido' });
    const data = await Empleado.create(req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un empleado con ese legajo en esta empresa' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear empleado' });
  }
}

async function update(req, res) {
  try {
    const data = await Empleado.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empleado no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe un empleado con ese legajo en esta empresa' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar empleado' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Empleado.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Empleado no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Empleado eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar empleado' });
  }
}

module.exports = { list, getOne, create, update, remove };
