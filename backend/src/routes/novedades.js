const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/novedades');

router.get   ('/matriz',                        controller.matrizGet);
router.post  ('/matriz',                        controller.matrizSave);
router.get   ('/',                              controller.list);       // ?empleado=&tipoNovedad=&fecha=
router.post  ('/',                              controller.create);
router.delete('/',                              controller.removeMasivo);
router.put   ('/:empleado/:tipo_novedad/:fecha', controller.update);
router.delete('/:empleado/:tipo_novedad/:fecha', controller.remove);

module.exports = router;
