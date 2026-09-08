const lsdConceptos = require('../services/lsdConceptos');
const lsdLiquidacion = require('../services/lsdLiquidacion');

// ARCA espera el .TXT en codificación ANSI (Windows-1252) — 'latin1' de Node
// codifica correctamente el rango de acentos/ñ del español (mismos puntos de
// código que Windows-1252 en ese rango).
async function conceptos(req, res, next) {
  try {
    const empresa = Number(req.query.empresa);
    if (!empresa) {
      return res.status(400).json({ estado: 'error', mensaje: 'Falta el parámetro empresa' });
    }
    const contenido = await lsdConceptos.generar(empresa);
    res.setHeader('Content-Type', 'text/plain; charset=windows-1252');
    res.setHeader('Content-Disposition', 'attachment; filename="LSD_Conceptos.txt"');
    res.send(Buffer.from(contenido, 'latin1'));
  } catch (e) { next(e); }
}

async function liquidacion(req, res, next) {
  try {
    const empresa = Number(req.query.empresa);
    const periodo = req.query.periodo;
    if (!empresa || !periodo) {
      return res.status(400).json({ estado: 'error', mensaje: 'Faltan los parámetros empresa/periodo' });
    }
    const contenido = await lsdLiquidacion.generar(empresa, periodo);
    if (contenido == null) {
      return res.status(404).json({ estado: 'error', mensaje: 'No existe una liquidación para ese período' });
    }
    res.setHeader('Content-Type', 'text/plain; charset=windows-1252');
    const nombre = `LSD_Liquidacion_${lsdLiquidacion.periodoAAAAMM(periodo)}.txt`;
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(Buffer.from(contenido, 'latin1'));
  } catch (e) { next(e); }
}

module.exports = { conceptos, liquidacion };
