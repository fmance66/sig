const Liquidacion = require('../models/liquidaciones');

async function list(req, res) {
  try {
    const { periodo, estado, fechaDesde, fechaHasta, descripcion, empresa } = req.query;
    const data = await Liquidacion.list({ periodo, estado, fechaDesde, fechaHasta, descripcion, empresa });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener liquidaciones' });
  }
}

async function getOne(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await Liquidacion.getByPeriodo(req.params.periodo, req.query.empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Liquidación no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener liquidación' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.periodo) return res.status(400).json({ estado: 'error', mensaje: 'periodo es requerido' });
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await Liquidacion.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe una liquidación con ese período para esta empresa' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear liquidación' });
  }
}

async function update(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const data = await Liquidacion.update(req.params.periodo, req.query.empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Liquidación no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar liquidación' });
  }
}

async function remove(req, res) {
  try {
    if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    const eliminada = await Liquidacion.remove(req.params.periodo, req.query.empresa);
    if (!eliminada) return res.status(404).json({ estado: 'error', mensaje: 'Liquidación no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Liquidación eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar liquidación' });
  }
}

module.exports = { list, getOne, create, update, remove };
