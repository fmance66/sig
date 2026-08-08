const Empresa = require('../models/empresas');

async function list(req, res) {
  try {
    const data = await Empresa.list();
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empresas' });
  }
}

async function getOne(req, res) {
  try {
    const data = await Empresa.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empresa' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.razon_social) return res.status(400).json({ estado: 'error', mensaje: 'razon_social es requerida' });
    const data = await Empresa.create(req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear empresa' });
  }
}

async function update(req, res) {
  try {
    const data = await Empresa.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar empresa' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Empresa.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Empresa eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar empresa' });
  }
}

module.exports = { list, getOne, create, update, remove };
