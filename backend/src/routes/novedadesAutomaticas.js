const express = require('express');
const router = express.Router();
const controller = require('../controllers/novedadesAutomaticas');

router.get('/empleados', controller.listEmpleados);
router.post('/', controller.generar);

module.exports = router;
