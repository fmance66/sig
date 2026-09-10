const express = require('express');
const router  = express.Router();
const controller = require('../controllers/informesIva');

router.get('/libro',   controller.libro);   // ?modulo=&empresa=&periodo=
router.get('/resumen', controller.resumen); // ?modulo=&empresa=&periodo=
router.get('/ddjj',    controller.ddjj);    // ?empresa=&periodo=

module.exports = router;
