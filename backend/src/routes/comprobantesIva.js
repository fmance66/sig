const express = require('express');
const router  = express.Router();
const controller = require('../controllers/comprobantesIva');

// ?modulo=&empresa=&periodo=&tipo=&persona=&fechaDesde=&fechaHasta=&anulado=&texto=
router.get('/', controller.list);

router.get   ('/:modulo/:tipo/:comprobante/:persona/:empresa', controller.getOne);
router.post  ('/',                                             controller.create);
router.put   ('/:modulo/:tipo/:comprobante/:persona/:empresa', controller.update);
router.delete('/:modulo/:tipo/:comprobante/:persona/:empresa', controller.remove);

router.put('/:modulo/:tipo/:comprobante/:persona/:empresa/impuestos', controller.setImpuestos); // body: { items: [...] }
router.put('/:modulo/:tipo/:comprobante/:persona/:empresa/items',     controller.setItems);     // body: { items: [...] }

module.exports = router;
