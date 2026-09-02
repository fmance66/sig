const model = require('../models/conceptoLsd');

async function getOne(req, res, next) {
  try {
    const data = await model.getByConcepto(req.params.id, Number(req.params.empresa));
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

async function upsert(req, res, next) {
  try {
    const data = await model.upsert(req.params.id, Number(req.params.empresa), req.body);
    res.json({ estado: 'ok', resultado: data });
  } catch (e) { next(e); }
}

module.exports = { getOne, upsert };
