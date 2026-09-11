const model = require('../models/formulaAsiento');

async function getMovimientos(req, res) {
  try {
    const data = await model.getMovimientos(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los movimientos de la fórmula de asiento' });
  }
}

async function setMovimientos(req, res) {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const data = await model.setMovimientos(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los movimientos de la fórmula de asiento' });
  }
}

async function getCentrosCosto(req, res) {
  try {
    const data = await model.getCentrosCosto(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los centros de costo de la fórmula de asiento' });
  }
}

async function setCentrosCosto(req, res) {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const data = await model.setCentrosCosto(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los centros de costo de la fórmula de asiento' });
  }
}

async function getProyectos(req, res) {
  try {
    const data = await model.getProyectos(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los proyectos de la fórmula de asiento' });
  }
}

async function setProyectos(req, res) {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const data = await model.setProyectos(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los proyectos de la fórmula de asiento' });
  }
}

module.exports = {
  getMovimientos, setMovimientos,
  getCentrosCosto, setCentrosCosto,
  getProyectos, setProyectos,
};
