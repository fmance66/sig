const express = require('express');
const router  = express.Router();
const controller = require('../controllers/modeloComprobanteIva');

router.get   ('/',             controller.list); // ?empresa=id
router.get   ('/:id/:empresa', controller.getOne);
router.post  ('/',             controller.create);
router.put   ('/:id/:empresa', controller.update);
router.delete('/:id/:empresa', controller.remove);

router.get('/:id/:empresa/impuestos', controller.getImpuestos);
router.put('/:id/:empresa/impuestos', controller.setImpuestos); // body: { items: [...] }

module.exports = router;
