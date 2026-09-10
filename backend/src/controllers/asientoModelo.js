const model = require('../models/asientoModelo');

async function getLineas(req, res) {
  try {
    const data = await model.getLineas(req.params.id, req.params.empresa);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener las líneas del asiento modelo' });
  }
}

async function setLineas(req, res) {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const data = await model.setLineas(req.params.id, req.params.empresa, items);
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar las líneas del asiento modelo' });
  }
}

module.exports = { getLineas, setLineas };
