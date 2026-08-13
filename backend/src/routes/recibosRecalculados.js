const express = require('express');
const router = express.Router();
const controller = require('../controllers/recibosRecalculados');

router.get('/', controller.list);
router.post('/recalcular', controller.recalcular);
router.post('/adicionar-concepto', controller.adicionarConcepto);

module.exports = router;
