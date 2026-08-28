const Empresa = require('../models/empresas');

async function list(req, res) {
  try {
    const data = await Empresa.list();
    res.json({ estado: 'ok', registros: data.length, resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empresas' });
  }
}

async function getOne(req, res) {
  try {
    const data = await Empresa.getById(req.params.id);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener empresa' });
  }
}

async function create(req, res) {
  try {
    if (!req.body.razon_social) return res.status(400).json({ estado: 'error', mensaje: 'razon_social es requerida' });
    const data = await Empresa.create(req.body);
    res.status(201).json({ estado: 'ok', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al crear empresa' });
  }
}

async function update(req, res) {
  try {
    const data = await Empresa.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', resultado: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al actualizar empresa' });
  }
}

async function remove(req, res) {
  try {
    const ok = await Empresa.remove(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Empresa eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar empresa' });
  }
}

// Detecta el content-type mirando la firma del archivo — sys_empresa.logo no
// guarda el mimetype aparte (mismo criterio que backend/src/pdf/disenoComun.js).
function detectImageMime(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}

async function getLogo(req, res) {
  try {
    const buf = await Empresa.getLogo(req.params.id);
    const mime = buf && detectImageMime(buf);
    if (!buf || !mime) return res.status(404).end();
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'no-store');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al obtener el logo' });
  }
}

async function uploadLogo(req, res) {
  try {
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || !buf.length || !detectImageMime(buf)) {
      return res.status(400).json({ estado: 'error', mensaje: 'La imagen debe ser PNG o JPEG' });
    }
    const ok = await Empresa.setLogo(req.params.id, buf);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Logo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al guardar el logo' });
  }
}

async function deleteLogo(req, res) {
  try {
    const ok = await Empresa.removeLogo(req.params.id);
    if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Empresa no encontrada' });
    res.json({ estado: 'ok', mensaje: 'Logo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ estado: 'error', mensaje: 'Error al eliminar el logo' });
  }
}

module.exports = { list, getOne, create, update, remove, getLogo, uploadLogo, deleteLogo };
