// idParams: nombres de los :params de ruta que identifican el registro, en el mismo orden
// que el idColumn del modelo (ver catalogo.js). Con clave compuesta (ej. ['id', 'empresa']
// para sld_concepto) las rutas de item pasan a ser /:id/:empresa.
function createCatalogoController(model, nombreEntidad, options = {}) {
  const { idParams = ['id'], filtroParams = [] } = options;
  const idFromReq = req => (idParams.length === 1 ? req.params[idParams[0]] : idParams.map(p => req.params[p]));

  async function list(req, res) {
    try {
      const filtros = Object.fromEntries(filtroParams.map(c => [c, req.query[c]]));
      const data = await model.list(filtros);
      res.json({ estado: 'ok', registros: data.length, resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al obtener ${nombreEntidad}` });
    }
  }

  async function getOne(req, res) {
    try {
      const data = await model.getById(idFromReq(req));
      if (!data) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al obtener ${nombreEntidad}` });
    }
  }

  async function create(req, res) {
    try {
      const faltante = idParams.find(p => !req.body[p]);
      if (faltante) return res.status(400).json({ estado: 'error', mensaje: `${faltante} es requerido` });
      const data = await model.create(req.body);
      res.status(201).json({ estado: 'ok', resultado: data });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: `Ya existe un/a ${nombreEntidad} con ese id` });
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al crear ${nombreEntidad}` });
    }
  }

  async function update(req, res) {
    try {
      const data = await model.update(idFromReq(req), req.body);
      if (!data) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al actualizar ${nombreEntidad}` });
    }
  }

  async function remove(req, res) {
    try {
      const ok = await model.remove(idFromReq(req));
      if (!ok) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', mensaje: `${nombreEntidad} eliminado/a` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al eliminar ${nombreEntidad}` });
    }
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createCatalogoController };
