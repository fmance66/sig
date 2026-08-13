const Recibo = require('../models/recibos');
const Novedad = require('../models/novedades');
const { calcularRecibo } = require('../services/reciboCalculo');

async function list(req, res) {
  try {
    const { periodo, legajo, empresa, convenio, categoria, grupo, estado } = req.query;
    const data = await Recibo.list({ periodo, legajo, empresa, convenio, categoria, grupo, estado });
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener recibos' });
  }
}

async function getOne(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const recibo = await Recibo.getHeader(periodo, empleado, numero);
    if (!recibo) return res.status(404).json({ estado: 'error', mensaje: 'Recibo no encontrado' });
    const conceptos = await Recibo.listConceptos(periodo, empleado, numero);
    const novedades = await Novedad.listByEmpleado(empleado);
    res.json({
      estado: 'ok',
      resultado: {
        recibo,
        conceptos,
        contribuciones: conceptos.filter(c => c.columna === 'CONTRIBUCION'),
        auxiliares: conceptos.filter(c => c.columna === 'AUXILIAR'),
        novedades,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener recibo' });
  }
}

async function create(req, res) {
  try {
    const { periodo, empleado } = req.body;
    if (!periodo || !empleado) return res.status(400).json({ estado: 'error', mensaje: 'periodo y empleado son requeridos' });
    const data = await Recibo.createHeader(req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ya existe ese número de recibo para el empleado en ese período' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear recibo' });
  }
}

async function update(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const data = await Recibo.updateHeader(periodo, empleado, numero, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Recibo no encontrado' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar recibo' });
  }
}

async function remove(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const ok = await Recibo.removeHeader(periodo, empleado, numero);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Recibo no encontrado' });
    res.json({ estado: 'ok', mensaje: 'Recibo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar recibo' });
  }
}

async function removeMasivo(req, res) {
  try {
    const { periodo, legajo, empresa, convenio, categoria, grupo } = req.body;
    const cantidad = await Recibo.removeMasivo({ periodo, legajo, empresa, convenio, categoria, grupo });
    res.json({ estado: 'ok', mensaje: `${cantidad} recibo(s) eliminado(s)`, cantidad });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar recibos' });
  }
}

async function recalcular(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const resultado = await calcularRecibo(periodo, empleado, numero);
    if (!resultado) return res.status(404).json({ estado: 'error', mensaje: 'Recibo no encontrado' });
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al recalcular recibo' });
  }
}

async function listConceptos(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    const data = await Recibo.listConceptos(periodo, empleado, numero);
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener conceptos del recibo' });
  }
}

async function createConcepto(req, res) {
  try {
    const { periodo, empleado, numero } = req.params;
    if (!req.body.concepto) return res.status(400).json({ estado: 'error', mensaje: 'concepto es requerido' });
    const data = await Recibo.createConcepto(periodo, empleado, numero, req.body);
    res.status(201).json({ estado: 'ok', resultado: data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ese concepto ya está cargado en el recibo' });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al agregar concepto al recibo' });
  }
}

async function updateConcepto(req, res) {
  try {
    const { periodo, empleado, numero, concepto } = req.params;
    const data = await Recibo.updateConcepto(periodo, empleado, numero, concepto, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado en el recibo' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar concepto del recibo' });
  }
}

async function removeConcepto(req, res) {
  try {
    const { periodo, empleado, numero, concepto } = req.params;
    const ok = await Recibo.removeConcepto(periodo, empleado, numero, concepto);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Concepto no encontrado en el recibo' });
    res.json({ estado: 'ok', mensaje: 'Concepto eliminado del recibo' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar concepto del recibo' });
  }
}

module.exports = {
  list, getOne, create, update, remove, removeMasivo, recalcular,
  listConceptos, createConcepto, updateConcepto, removeConcepto,
};
