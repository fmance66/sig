const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/grupos');

router.get   ('/',             controller.list);
router.get   ('/:id',          controller.getOne);
router.post  ('/',             controller.create);
router.put   ('/:id',          controller.update);
router.delete('/:id',          controller.remove);
router.get   ('/:id/usuarios', controller.listUsuarios);
router.put   ('/:id/usuarios', controller.setUsuarios);
router.get   ('/:id/permisos', controller.listPermisos);
router.put   ('/:id/permisos', controller.setPermisos);

module.exports = router;
