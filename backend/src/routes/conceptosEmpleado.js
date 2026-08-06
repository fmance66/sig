const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/conceptos');

router.get   ('/',                                        controller.listIndividuales); // ?empleado=1
router.post  ('/',                                        controller.createIndividual);
router.delete('/:empleado/:concepto/:liquidacion/:recibo', controller.removeIndividual);

module.exports = router;
