const model = require('../models/topePrevisional');
const scraper = require('../services/topePrevisionalScraper');

const RE_PERIODO = /^\d{6}$/;

// Si ya está guardado (cargado a mano o confirmado en una generación anterior),
// se devuelve tal cual. Si no, se intenta el scraping asistido y se devuelve
// sin persistir — la pantalla lo muestra editable y recién se guarda cuando el
// usuario confirma/genera el archivo (ver upsert).
async function getOne(req, res, next) {
  try {
    const { periodo } = req.params;
    if (!RE_PERIODO.test(periodo)) {
      return res.status(400).json({ estado: 'error', mensaje: 'Período inválido (formato AAAAMM)' });
    }

    const guardado = await model.getByPeriodo(periodo);
    if (guardado) {
      return res.json({ estado: 'ok', resultado: { ...guardado, guardado: true } });
    }

    const scrapeado = await scraper.scrapear(periodo);
    if (scrapeado) {
      return res.json({ estado: 'ok', resultado: { periodo, ...scrapeado, origen: 'SCRAPE', guardado: false } });
    }

    res.json({ estado: 'ok', resultado: { periodo, minimo: null, maximo: null, origen: null, guardado: false } });
  } catch (e) { next(e); }
}

async function upsert(req, res, next) {
  try {
    const { periodo } = req.params;
    if (!RE_PERIODO.test(periodo)) {
      return res.status(400).json({ estado: 'error', mensaje: 'Período inválido (formato AAAAMM)' });
    }
    const { minimo, maximo, origen, fuente } = req.body;
    if (minimo == null || maximo == null) {
      return res.status(400).json({ estado: 'error', mensaje: 'Faltan los valores de tope mínimo/máximo' });
    }
    const data = await model.upsert(periodo, { minimo, maximo, origen, fuente });
    res.json({ estado: 'ok', resultado: { ...data, guardado: true } });
  } catch (e) { next(e); }
}

module.exports = { getOne, upsert };
