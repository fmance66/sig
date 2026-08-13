const model = require('../models/conceptos');

async function listIndividuales(req, res, next) {
  try {
    const { empleado } = req.query;
    if (!empleado) return res.status(400).json({ estado: 'error', mensaje: 'empleado es requerido' });
    const data = await model.listIndividualesByEmpleado(empleado);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function createIndividual(req, res, next) {
  try {
    const { empleado, concepto } = req.body;
    if (!empleado || !concepto) {
      return res.status(400).json({ estado: 'error', mensaje: 'empleado y concepto son requeridos' });
    }
    const data = await model.createIndividual(empleado, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function removeIndividual(req, res, next) {
  try {
    const { empleado, concepto, liquidacion, recibo } = req.params;
    const ok = await model.removeIndividual(empleado, concepto, liquidacion, Number(recibo));
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Concepto eliminado' });
  } catch (e) { next(e); }
}

async function listGrupales(req, res, next) {
  try {
    const { grupo } = req.query;
    const data = await model.listGrupales(grupo);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (e) { next(e); }
}

async function createGrupal(req, res, next) {
  try {
    const { grupo_de_conceptos, concepto } = req.body;
    if (!grupo_de_conceptos || !concepto) {
      return res.status(400).json({ estado: 'error', mensaje: 'grupo_de_conceptos y concepto son requeridos' });
    }
    const data = await model.createGrupal(grupo_de_conceptos, req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (e) { next(e); }
}

async function removeGrupal(req, res, next) {
  try {
    const { grupo, concepto, liquidacion, recibo } = req.params;
    const ok = await model.removeGrupal(grupo, concepto, liquidacion, Number(recibo));
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Concepto eliminado' });
  } catch (e) { next(e); }
}

module.exports = {
  listIndividuales, createIndividual, removeIndividual,
  listGrupales, createGrupal, removeGrupal,
};
