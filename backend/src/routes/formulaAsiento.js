const { createCatalogoModel }      = require('../models/catalogo');
const { createCatalogoController } = require('../controllers/catalogo');
const { createCatalogoRouterCompuesto } = require('./catalogo');
const subController = require('../controllers/formulaAsiento');

const COLUMNS = [
  'descripcion', 'grupo', 'fecha', 'leyenda', 'condicion', 'asiento_negativo',
  'pesificar', 'unir_asientos', 'combinar_cuentas',
  'dividir_rubro', 'dividir_proyecto', 'dividir_imputable', 'orden',
];
const NUMERIC = ['orden'];

const model = createCatalogoModel('cnt_modelo_asiento', COLUMNS, NUMERIC, { idColumn: ['id', 'empresa'] });
// filtroParams incluye 'grupo' además del 'empresa' automático: cada una de
// las 4 pantallas (Venta/Compra/Pago/Cobro) filtra por su grupo fijo
// (IVA_VENTA/IVA_COMPRA/PAGO/COBRO), igual que ?estado=inactivo en Empleados.
const controller = createCatalogoController(model, 'fórmula de asiento', { idParams: ['id', 'empresa'], filtroParams: ['empresa', 'grupo'] });
const router = createCatalogoRouterCompuesto(controller, ['id', 'empresa']);

router.get('/:id/:empresa/movimientos',   subController.getMovimientos);
router.put('/:id/:empresa/movimientos',   subController.setMovimientos);
router.get('/:id/:empresa/centros-costo', subController.getCentrosCosto);
router.put('/:id/:empresa/centros-costo', subController.setCentrosCosto);
router.get('/:id/:empresa/proyectos',     subController.getProyectos);
router.put('/:id/:empresa/proyectos',     subController.setProyectos);

module.exports = router;
