const express = require('express');
const router  = express.Router();
const controller = require('../controllers/cuentas');

router.get   ('/arbol',                       controller.arbol); // ?empresa=id
router.get   ('/',                            controller.list);  // ?empresa=id
router.get   ('/:id/:empresa',                controller.getOne);
router.post  ('/',                            controller.create);
router.put   ('/:id/:empresa',                controller.update);
router.delete('/:id/:empresa',                controller.remove);

router.get('/:id/:empresa/centros-costo', controller.getCentrosCosto);
router.put('/:id/:empresa/centros-costo', controller.setCentrosCosto);

module.exports = router;
