const express = require('express');
const router  = express.Router();
const controller = require('../controllers/tipoComprobanteIva');

router.get   ('/',             controller.list); // ?empresa=id
router.get   ('/:id/:empresa', controller.getOne);
router.post  ('/',             controller.create);
router.put   ('/:id/:empresa', controller.update);
router.delete('/:id/:empresa', controller.remove);

router.get('/:id/:empresa/letras', controller.getLetras);
router.put('/:id/:empresa/letras', controller.setLetras); // body: { items: [{ letra, punto, tipo_afip }] }

module.exports = router;
