const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/empresas');

const rawImage = express.raw({ type: ['image/png', 'image/jpeg'], limit: '5mb' });

router.get   ('/',        controller.list);
router.get   ('/:id/logo', controller.getLogo);
router.put   ('/:id/logo', rawImage, controller.uploadLogo);
router.delete('/:id/logo', controller.deleteLogo);
router.get   ('/:id',     controller.getOne);
router.post  ('/',        controller.create);
router.put   ('/:id',     controller.update);
router.delete('/:id',     controller.remove);

router.get   ('/:id/tiene-configuracion',   controller.tieneConfiguracion);
router.post  ('/:id/copiar-configuracion',  controller.copiarConfiguracion);

module.exports = router;
