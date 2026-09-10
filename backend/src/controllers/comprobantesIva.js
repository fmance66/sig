const Comprobante = require('../models/comprobantesIva');

async function list(req, res) {
  try {
    const { modulo, empresa, periodo, tipo, persona, fechaDesde, fechaHasta, anulado, texto } = req.query;
    const data = await Comprobante.list({ modulo, empresa, periodo, tipo, persona, fechaDesde, fechaHasta, anulado, texto });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener comprobantes' });
  }
}

async function getOne(req, res) {
  try {
    const { modulo, tipo, comprobante, persona, empresa } = req.params;
    const data = await Comprobante.getFull(modulo, tipo, comprobante, persona, empresa);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el comprobante' });
  }
}

async function create(req, res) {
  try {
    const faltante = ['modulo', 'tipo', 'comprobante', 'persona', 'empresa'].find(c => !req.body[c]);
    if (faltante) return res.status(400).json({ estado: 'error', mensaje: `${faltante} es requerido` });
    const data = await Comprobante.createHeader(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe ese comprobante para esa persona' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el comprobante' });
  }
}

async function update(req, res) {
  try {
    const { modulo, tipo, comprobante, persona, empresa } = req.params;
    const data = await Comprobante.updateHeader(modulo, tipo, comprobante, persona, empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Comprobante no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el comprobante' });
  }
}

async function remove(req, res) {
  try {
    const { modulo, tipo, comprobante, persona, empresa } = req.params;
    const ok = await Comprobante.removeHeader(modulo, tipo, comprobante, persona, empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Comprobante no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Comprobante eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el comprobante' });
  }
}

async function setImpuestos(req, res) {
  try {
    const { modulo, tipo, comprobante, persona, empresa } = req.params;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const data = await Comprobante.setImpuestos(modulo, tipo, comprobante, persona, empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los impuestos del comprobante' });
  }
}

async function setItems(req, res) {
  try {
    const { modulo, tipo, comprobante, persona, empresa } = req.params;
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const data = await Comprobante.setItems(modulo, tipo, comprobante, persona, empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar los ítems del comprobante' });
  }
}

module.exports = { list, getOne, create, update, remove, setImpuestos, setItems };
