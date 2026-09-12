const { contabilizarPeriodo } = require('../lib/contabilizarIva');

async function contabilizar(req, res) {
  try {
    const { periodo, empresa } = req.params;
    const resultado = await contabilizarPeriodo({ periodo, empresa, modo: 'nuevos' });
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al contabilizar los comprobantes del período' });
  }
}

async function recalcular(req, res) {
  try {
    const { periodo, empresa } = req.params;
    const resultado = await contabilizarPeriodo({ periodo, empresa, modo: 'recalcular' });
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ estado: 'error', mensaje: err.message });
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al recalcular los comprobantes del período' });
  }
}

module.exports = { contabilizar, recalcular };
