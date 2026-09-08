const express = require('express');
const router = express.Router();
const controller = require('../controllers/liquidaciones');

router.get('/', controller.list); // ?periodo=&estado=&fechaDesde=&fechaHasta=&descripcion=&empresa=
router.get('/:periodo', controller.getOne); // ?empresa= (requerido)
router.post('/', controller.create); // body: { periodo, empresa, ... }
router.put('/:periodo', controller.update); // ?empresa= (requerido)
router.delete('/:periodo', controller.remove); // ?empresa= (requerido)

module.exports = router;
