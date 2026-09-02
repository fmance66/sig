const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/conceptoGeneral');

router.get   ('/', controller.list); // ?empresa=id
router.post  ('/', controller.create);
router.delete('/:empresa/:concepto/:liquidacion/:recibo', controller.remove);

module.exports = router;
