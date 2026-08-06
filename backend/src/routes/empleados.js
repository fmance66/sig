const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/empleados');
const lsdController = require('../controllers/empleadoLsd');

router.get   ('/',    controller.list);    // ?empresa=icp_sa
router.get   ('/:id', controller.getOne);
router.post  ('/',    controller.create);
router.put   ('/:id', controller.update);
router.delete('/:id', controller.remove);

router.get('/:id/lsd', lsdController.getOne);
router.put('/:id/lsd', lsdController.upsert);

module.exports = router;
