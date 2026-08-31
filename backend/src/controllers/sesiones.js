const Sesion = require('../models/sesiones');

async function list(req, res) {
  try {
    const rows = await Sesion.list();
    const resultado = rows.map(r => ({ ...r, propia: r.sid === req.sessionID }));
    res.json({ estado: 'ok', resultado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener las sesiones' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Sesion.remove(req.params.sid);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Sesión no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Sesión revocada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al revocar la sesión' });
  }
}

module.exports = { list, remove };
