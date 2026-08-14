const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/historialEmpleado');

router.get   ('/',                              controller.list);   // ?empleado=&campo=&fechaDesde=&fechaHasta=
router.post  ('/',                              controller.create);
router.delete('/',                              controller.removeMasivo);
router.put   ('/:empleado/:campo/:fecha_desde', controller.update);
router.delete('/:empleado/:campo/:fecha_desde', controller.remove);

module.exports = router;
