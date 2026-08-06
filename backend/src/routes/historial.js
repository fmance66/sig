const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/historial');

router.get   ('/',                            controller.list);   // ?empleado=1
router.post  ('/',                            controller.create);
router.delete('/:empleado/:campo/:fecha_desde', controller.remove);

module.exports = router;
