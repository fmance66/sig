const model = require('../models/asientos');

async function list(req, res) {
  try {
    const { empresa, ejercicio, cuenta, leyenda } = req.query;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    if (!ejercicio) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio es requerido' });
    const data = await model.list(ejercicio, empresa, { cuenta, leyenda });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el listado de asientos' });
  }
}

async function desbalanceados(req, res) {
  try {
    const { empresa, ejercicio } = req.query;
    if (!empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
    if (!ejercicio) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio es requerido' });
    const data = await model.listDesbalanceados(ejercicio, empresa);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los asientos desbalanceados' });
  }
}

async function getMovimientos(req, res) {
  try {
    const { ejercicio, numero, empresa } = req.params;
    const data = await model.getMovimientos(ejercicio, numero, empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener los movimientos del asiento' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.ejercicio || !req.body.empresa || !req.body.fecha) {
      return res.status(400).json({ estado: 'error', mensaje: 'ejercicio, empresa y fecha son requeridos' });
    }
    const data = await model.create(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear el asiento' });
  }
}

async function update(req, res) {
  try {
    const { ejercicio, numero, empresa } = req.params;
    const data = await model.update(ejercicio, numero, empresa, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Asiento no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar el asiento' });
  }
}

async function remove(req, res) {
  try {
    const { ejercicio, numero, empresa } = req.params;
    const ok = await model.remove(ejercicio, numero, empresa);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Asiento no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Asiento eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el asiento' });
  }
}

async function union(req, res) {
  try {
    const { ejercicio, empresa, numeros, fecha, leyenda, unirLeyendas } = req.body;
    if (!ejercicio || !empresa) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio y empresa son requeridos' });
    const data = await model.union({ ejercicio, empresa, numeros, fecha, leyenda, unirLeyendas });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al unir los asientos' });
  }
}

async function renumerar(req, res) {
  try {
    const { ejercicio, empresa, numeroInicial, incremento, orden } = req.body;
    if (!ejercicio || !empresa) return res.status(400).json({ estado: 'error', mensaje: 'ejercicio y empresa son requeridos' });
    const data = await model.renumerar({ ejercicio, empresa, numeroInicial, incremento, orden });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al renumerar los asientos' });
  }
}

module.exports = { list, desbalanceados, getMovimientos, create, update, remove, union, renumerar };
