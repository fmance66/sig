const model = require('../models/informesContables');

function validar(req, res) {
  const { empresa, ejercicio } = req.query;
  if (!empresa) { res.status(400).json({ estado: 'error', mensaje: 'empresa es requerida' }); return false; }
  if (!ejercicio) { res.status(400).json({ estado: 'error', mensaje: 'ejercicio es requerido' }); return false; }
  return true;
}

function handler(fn, mensajeError) {
  return async (req, res) => {
    try {
      if (!validar(req, res)) return;
      const { empresa, ejercicio } = req.query;
      const data = await fn(req, ejercicio, empresa);
      res.json({ estado: 'ok', resultado: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ estado: 'error', mensaje: mensajeError });
    }
  };
}

module.exports = {
  mayorCuentas: handler(
    (req, ejercicio, empresa) => model.mayorCuentas(ejercicio, empresa, { cuenta: req.query.cuenta, leyenda: req.query.leyenda }),
    'Error al obtener el Mayor de Cuentas'
  ),
  balanceGeneral: handler(
    (req, ejercicio, empresa) => model.balanceGeneral(ejercicio, empresa),
    'Error al obtener el Balance General'
  ),
  balanceSumasSaldos: handler(
    (req, ejercicio, empresa) => model.balanceSumasYSaldos(ejercicio, empresa),
    'Error al obtener el Balance de Sumas y Saldos'
  ),
  libroDiarioAcumulado: handler(
    (req, ejercicio, empresa) => model.libroDiarioAcumulado(ejercicio, empresa, req.query.periodo),
    'Error al obtener el Libro Diario Acumulado'
  ),
  libroCentrosCosto: handler(
    (req, ejercicio, empresa) => model.libroCentrosCosto(ejercicio, empresa),
    'Error al obtener el Libro de Centros de Costo'
  ),
  balanceCentrosCosto: handler(
    (req, ejercicio, empresa) => model.balanceCentrosCosto(ejercicio, empresa),
    'Error al obtener el Balance de Centros de Costo'
  ),
};
