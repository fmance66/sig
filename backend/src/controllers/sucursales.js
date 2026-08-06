const model = require('../models/sucursales');

async function list(req, res, next) {
  try {
    const { empresa } = req.query;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerido' });
    const data = await model.listByEmpresa(empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function create(req, res, next) {
  try {
    if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerido' });
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const data = await model.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Sucursal no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const ok = await model.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Sucursal no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Sucursal eliminada' });
  } catch (e) { next(e); }
}

module.exports = { list, create, update, remove };
