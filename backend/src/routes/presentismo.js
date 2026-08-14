const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/presentismo');

router.get   ('/',                    controller.list);   // ?empleado=&fechaDesde=&fechaHasta=&tipo=
router.post  ('/',                    controller.create);
router.put   ('/:empleado/:fecha/:hora', controller.update);
router.delete('/:empleado/:fecha/:hora', controller.remove);

module.exports = router;
