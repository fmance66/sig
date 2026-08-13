const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/conceptoGeneral');

router.get   ('/', controller.list);
router.post  ('/', controller.create);
router.delete('/:concepto/:liquidacion/:recibo', controller.remove);

module.exports = router;
