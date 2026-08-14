const { renderToStream } = require('@react-pdf/renderer');
const recibosModel = require('../models/recibos');
const { ReciboDocument } = require('../pdf/reciboTemplate');
const { LibroDocument } = require('../pdf/libroTemplate');

async function streamRecibosPdf(recibos) {
  const bundles = [];
  for (const r of recibos) {
    const recibo = await recibosModel.getHeader(r.periodo, r.empleado, r.numero);
    const conceptos = await recibosModel.listConceptos(r.periodo, r.empleado, r.numero);
    bundles.push({ recibo, conceptos });
  }
  return renderToStream(ReciboDocument(bundles));
}

async function streamLibroPdf(recibos) {
  return renderToStream(LibroDocument(recibos));
}

module.exports = { streamRecibosPdf, streamLibroPdf };
