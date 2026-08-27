function createParametroController(model) {
  async function list(req, res, next) {
    try {
      const data = await model.list(req.params.id);
      res.json({ estado: 'ok', registros: data.length, resultado: data });
    } catch (e) { next(e); }
  }

  async function create(req, res, next) {
    try {
      if (!req.body.parametro) return res.status(400).json({ estado: 'error', mensaje: 'parametro es requerido' });
      const data = await model.create(req.params.id, req.body);
      res.status(201).json({ estado: 'ok', data });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ese parámetro ya existe en el formulario' });
      next(e);
    }
  }

  async function update(req, res, next) {
    try {
      if (!req.body.parametro) return res.status(400).json({ estado: 'error', mensaje: 'parametro es requerido' });
      const data = await model.update(req.params.id, req.params.parametro, req.body);
      if (!data) return res.status(404).json({ estado: 'error', mensaje: 'Parámetro no encontrado' });
      res.json({ estado: 'ok', data });
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ estado: 'error', mensaje: 'Ese parámetro ya existe en el formulario' });
      next(e);
    }
  }

  async function remove(req, res, next) {
    try {
      const ok = await model.remove(req.params.id, req.params.parametro);
      if (!ok) return res.status(404).json({ estado: 'error', mensaje: 'Parámetro no encontrado' });
      res.json({ estado: 'ok', mensaje: 'Parámetro eliminado' });
    } catch (e) { next(e); }
  }

  return { list, create, update, remove };
}

module.exports = { createParametroController };
