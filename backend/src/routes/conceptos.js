const express = require('express');
const router  = express.Router();

const { createCatalogoModel }      = require('../models/catalogo');
const { createCatalogoController } = require('../controllers/catalogo');
const lsdController = require('../controllers/conceptoLsd');

const CONCEPTO_COLUMNS = [
  'id_afip', 'descripcion', 'columna', 'simbolo_unidad', 'decimales_unidad', 'unidad_visible',
  'simbolo_unitario', 'decimales_unitario', 'unitario_visible', 'simbolo_afip',
  'campo_unidad', 'leyenda_unidad', 'campo_importe', 'leyenda_importe',
  'formula_unidad', 'formula_importe', 'formula_unitario', 'formula_condicion',
  'activo', 'orden', 'clase',
];
const CONCEPTO_NUMERIC = ['decimales_unidad', 'orden'];

const model      = createCatalogoModel('sld_concepto', CONCEPTO_COLUMNS, CONCEPTO_NUMERIC);
const controller = createCatalogoController(model, 'concepto');

router.get   ('/',    controller.list);
router.get   ('/:id', controller.getOne);
router.post  ('/',    controller.create);
router.put   ('/:id', controller.update);
router.delete('/:id', controller.remove);

router.get('/:id/lsd', lsdController.getOne);
router.put('/:id/lsd', lsdController.upsert);

module.exports = router;
