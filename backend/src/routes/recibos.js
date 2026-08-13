const express = require('express');
const router = express.Router();
const controller = require('../controllers/recibos');

router.get('/', controller.list); // ?periodo=&legajo=&empresa=&convenio=&categoria=&grupo=&estado=
router.delete('/', controller.removeMasivo); // body: { periodo, legajo, empresa, convenio, categoria, grupo }

router.get('/:periodo/:empleado/:numero', controller.getOne);
router.post('/', controller.create);
router.put('/:periodo/:empleado/:numero', controller.update);
router.delete('/:periodo/:empleado/:numero', controller.remove);
router.post('/:periodo/:empleado/:numero/recalcular', controller.recalcular);

router.get('/:periodo/:empleado/:numero/conceptos', controller.listConceptos);
router.post('/:periodo/:empleado/:numero/conceptos', controller.createConcepto);
router.put('/:periodo/:empleado/:numero/conceptos/:concepto', controller.updateConcepto);
router.delete('/:periodo/:empleado/:numero/conceptos/:concepto', controller.removeConcepto);

module.exports = router;
