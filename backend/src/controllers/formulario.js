function createFormularioController(model, nombreEntidad) {
  async function list(req, res) {
    try {
      if (!req.query.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
      const data = await model.list(req.query.empresa);
      res.json({ estado: 'ok', registros: data.length, resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al obtener ${nombreEntidad}` });
    }
  }

  async function getOne(req, res) {
    try {
      const data = await model.getById(req.params.id);
      if (!data) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al obtener ${nombreEntidad}` });
    }
  }

  async function create(req, res) {
    try {
      if (!req.body.empresa) return res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' });
      if (!req.body.nombre) return res.status(400).json({ estado: 'error', mensaje: 'nombre es requerido' });
      const data = await model.create(req.body.empresa, req.body);
      res.status(201).json({ estado: 'ok', resultado: data });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: `Ya existe un/a ${nombreEntidad} con ese nombre en esta empresa` });
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al crear ${nombreEntidad}` });
    }
  }

  async function update(req, res) {
    try {
      const data = await model.update(req.params.id, req.body);
      if (!data) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', resultado: data });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ estado: 'error', mensaje: `Ya existe un/a ${nombreEntidad} con ese nombre en esta empresa` });
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al actualizar ${nombreEntidad}` });
    }
  }

  async function remove(req, res) {
    try {
      const ok = await model.remove(req.params.id);
      if (!ok) return res.status(404).json({ estado: 'error', mensaje: `${nombreEntidad} no encontrado/a` });
      res.json({ estado: 'ok', mensaje: `${nombreEntidad} eliminado/a` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: `Error al eliminar ${nombreEntidad}` });
    }
  }

  return { list, getOne, create, update, remove };
}

module.exports = { createFormularioController };
