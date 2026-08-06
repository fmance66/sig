const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/conceptos');

router.get('/', controller.listGrupales); // ?grupo=grupo_de_conceptos_id

module.exports = router;
