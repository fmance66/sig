const express = require('express');
const router  = express.Router();
const controller = require('../controllers/ajusteInflacion');

router.post('/preview', controller.preview);
router.post('/generar', controller.generar);

module.exports = router;
