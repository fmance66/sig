const express = require('express');
const router = express.Router();
const controller = require('../controllers/recibosAutomaticos');

router.get('/empleados', controller.listEmpleados);
router.post('/', controller.generar);

module.exports = router;
