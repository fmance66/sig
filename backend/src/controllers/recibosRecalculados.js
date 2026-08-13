const model = require('../models/recibosRecalculados');

function filtroFromQuery(q) {
  const { periodo, fecha, legajo, empresa, convenio, categoria, grupo, estado } = q;
  return { periodo, fecha, legajo, empresa, convenio, categoria, grupo, estado };
}

async function list(req, res) {
  try {
    const data = await model.list(filtroFromQuery(req.query));
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener recibos recalculados' });
  }
}

async function recalcular(req, res) {
  try {
    const data = await model.recalcular(req.body.filtro || {});
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al recalcular recibos' });
  }
}

async function adicionarConcepto(req, res) {
  try {
    const { filtro, concepto, descripcion, unidad_manual, importe_manual } = req.body;
    if (!concepto) return res.status(400).json({ estado: 'error', mensaje: 'concepto es requerido' });
    const aplicados = await model.adicionarConcepto(filtro || {}, { concepto, descripcion, unidad_manual, importe_manual });
    res.json({ estado: 'ok', mensaje: `Concepto agregado a ${aplicados} recibo(s)`, aplicados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al adicionar concepto' });
  }
}

module.exports = { list, recalcular, adicionarConcepto };
