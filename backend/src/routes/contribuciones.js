const express = require('express');
const router = express.Router();
const controller = require('../controllers/contribuciones');

router.get('/', controller.list); // ?periodo=&legajo=&convenio=&categoria=&grupo=&estado=&columna=CONTRIBUCION|AUXILIAR
router.get('/:periodo/:empleado/:numero/detalle', controller.detalle);

module.exports = router;
