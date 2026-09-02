const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/conceptos');

router.get('/', controller.listGrupales); // ?grupo=grupo_de_conceptos_id&empresa=id
router.post('/', controller.createGrupal);
router.delete('/:grupo/:empresa/:concepto/:liquidacion/:recibo', controller.removeGrupal);

module.exports = router;
