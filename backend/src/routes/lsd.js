const express = require('express');
const router = express.Router();
const lsdExport = require('../controllers/lsdExport');
const topePrevisional = require('../controllers/topePrevisional');

router.get('/conceptos', lsdExport.conceptos);
router.get('/liquidacion', lsdExport.liquidacion);

router.get('/topes/:periodo', topePrevisional.getOne);
router.put('/topes/:periodo', topePrevisional.upsert);

module.exports = router;
