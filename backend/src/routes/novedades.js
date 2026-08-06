const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/novedades');

router.get   ('/',                              controller.list);   // ?empleado=1
router.post  ('/',                              controller.create);
router.delete('/:empleado/:tipo_novedad/:fecha', controller.remove);

module.exports = router;
