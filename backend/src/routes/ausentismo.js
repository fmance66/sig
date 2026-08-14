const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/ausentismo');

router.get   ('/',                              controller.list);   // ?empleado=&motivo=&fechaDesde=&fechaHasta=
router.post  ('/',                              controller.create);
router.put   ('/:empleado/:motivo/:fecha_desde', controller.update);
router.delete('/:empleado/:motivo/:fecha_desde', controller.remove);

module.exports = router;
