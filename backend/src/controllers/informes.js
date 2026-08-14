const model = require('../models/informes');
const recibosModel = require('../models/recibos');
const pdfInformes = require('../services/pdfInformes');

const MAX_RECIBOS_PDF = 200;

function filtroDesdeQuery(q) {
  return {
    periodo: q.periodo, legajo: q.legajo, convenio: q.convenio, categoria: q.categoria,
    grupo: q.grupo, estado: q.estado, agrupadoPor: q.agrupadoPor, concepto: q.concepto, orden: q.orden,
  };
}

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const data = await fn(filtroDesdeQuery(req.query));
      res.json({ estado: 'ok', resultado: data });
    } catch (e) { next(e); }
  };
}

module.exports = {
  conceptosAcumulados:  wrap(model.conceptosAcumulados),
  conceptosPorGrupo:    wrap(model.conceptosPorGrupo),
  conceptosPorEmpleado: wrap(model.conceptosPorEmpleado),
  conceptosPorRecibo:   wrap(model.conceptosPorRecibo),

  remuneracionPorConceptos: wrap(model.remuneracionPorConceptos),
  remuneracionPorGrupos:    wrap(model.remuneracionPorGrupos),
  remuneracionPorEmpleados: wrap(async (filtro) => {
    const rows = await recibosModel.list(filtro);
    return { recibos: rows };
  }),

  recibosSueldo: wrap(async (filtro) => {
    const rows = await recibosModel.list(filtro);
    return { recibos: rows };
  }),

  recibosSueldoPdf: async (req, res, next) => {
    try {
      const filtro = filtroDesdeQuery(req.query);
      const rows = await recibosModel.list(filtro);
      if (!rows.length) return res.status(404).json({ estado: 'error', mensaje: 'No hay recibos para los filtros seleccionados' });
      if (rows.length > MAX_RECIBOS_PDF) {
        return res.status(400).json({ estado: 'error', mensaje: `Demasiados recibos para exportar (máx. ${MAX_RECIBOS_PDF}) — acote los filtros` });
      }
      const stream = await pdfInformes.streamRecibosPdf(rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="recibos-sueldo.pdf"');
      stream.pipe(res);
    } catch (e) { next(e); }
  },

  libroSueldoPdf: async (req, res, next) => {
    try {
      const filtro = filtroDesdeQuery(req.query);
      const rows = await recibosModel.list(filtro);
      if (!rows.length) return res.status(404).json({ estado: 'error', mensaje: 'No hay recibos para los filtros seleccionados' });
      const stream = await pdfInformes.streamLibroPdf(rows);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="libro-sueldos.pdf"');
      stream.pipe(res);
    } catch (e) { next(e); }
  },
};
