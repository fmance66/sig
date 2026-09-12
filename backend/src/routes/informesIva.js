const express = require('express');
const router  = express.Router();
const controller = require('../controllers/informesIva');

router.get('/libro',        controller.libro);        // ?modulo=&empresa=&periodo=
router.get('/resumen',      controller.resumen);      // ?modulo=&empresa=&periodo=
router.get('/ddjj',         controller.ddjj);         // ?empresa=&periodo=
router.get('/comprobantes', controller.comprobantes); // ?modulo=&empresa=&periodo=
router.get('/rubros',       controller.rubros);       // ?modulo=&empresa=&periodo=
router.get('/provincias',   controller.provincias);   // ?modulo=&empresa=&periodo=
router.get('/items',        controller.items);        // ?modulo=&empresa=&periodo=
router.get('/items-por-comprobante', controller.itemsPorComprobante); // ?modulo=&empresa=&periodo=

module.exports = router;
