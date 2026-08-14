const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/historial');

router.get   ('/',                     controller.list);   // ?campo=&fechaDesde=&fechaHasta=
router.post  ('/',                     controller.create);
router.delete('/',                     controller.removeMasivo);
router.put   ('/:campo/:fecha_desde',  controller.update);
router.delete('/:campo/:fecha_desde',  controller.remove);

module.exports = router;
