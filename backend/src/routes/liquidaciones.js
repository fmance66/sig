const express = require('express');
const router = express.Router();
const controller = require('../controllers/liquidaciones');

router.get('/', controller.list); // ?periodo=&estado=&fechaDesde=&fechaHasta=&descripcion=
router.get('/:periodo', controller.getOne);
router.post('/', controller.create);
router.put('/:periodo', controller.update);
router.delete('/:periodo', controller.remove);

module.exports = router;
