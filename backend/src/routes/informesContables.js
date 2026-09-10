const express = require('express');
const router  = express.Router();
const controller = require('../controllers/informesContables');

router.get('/mayor-cuentas',          controller.mayorCuentas);          // ?empresa=&ejercicio=&cuenta=&leyenda=
router.get('/balance-general',        controller.balanceGeneral);        // ?empresa=&ejercicio=
router.get('/balance-sumas-saldos',   controller.balanceSumasSaldos);    // ?empresa=&ejercicio=
router.get('/libro-diario-acumulado', controller.libroDiarioAcumulado);  // ?empresa=&ejercicio=&periodo=mensual|trimestral|anual
router.get('/libro-centros-costo',    controller.libroCentrosCosto);     // ?empresa=&ejercicio=
router.get('/balance-centros-costo',  controller.balanceCentrosCosto);   // ?empresa=&ejercicio=

module.exports = router;
