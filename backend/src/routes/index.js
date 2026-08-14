const express = require('express');
const router  = express.Router();

const { createCatalogoModel }      = require('../models/catalogo');
const { createCatalogoController } = require('../controllers/catalogo');
const { createCatalogoRouter }     = require('./catalogo');

function catalogo(tableName, columns, numericColumns, nombreEntidad, options) {
  const model      = createCatalogoModel(tableName, columns, numericColumns, options);
  const controller = createCatalogoController(model, nombreEntidad);
  return createCatalogoRouter(controller);
}

router.use('/estado',    require('./estado'));
router.use('/empresas',  require('./empresas'));
router.use('/empleados', require('./empleados'));
router.use('/sucursales', require('./sucursales'));
router.use('/familiares', require('./familiares'));
router.use('/novedades', require('./novedades'));
router.use('/novedades-automaticas', require('./novedadesAutomaticas'));
router.use('/historial', require('./historial'));
router.use('/historial-empleado', require('./historialEmpleado'));
router.use('/historial-automatico', require('./historialAutomatico'));
router.use('/ausentismos', require('./ausentismo'));
router.use('/presentismos', require('./presentismo'));
router.use('/jornada-laboral', require('./jornadaLaboral'));
router.use('/conceptos-empleado', require('./conceptosEmpleado'));
router.use('/conceptos-grupo', require('./conceptosGrupo'));
router.use('/liquidaciones', require('./liquidaciones'));
router.use('/recibos', require('./recibos'));
router.use('/recibos-automaticos', require('./recibosAutomaticos'));
router.use('/recibos-recalculados', require('./recibosRecalculados'));
router.use('/listado-contribuciones', require('./contribuciones'));
router.use('/informes', require('./informes'));

router.use('/convenios', catalogo('sld_convenio',
  ['descripcion', 'liquidacion', 'dias', 'horas', 'moneda', 'obra_social', 'grupo_de_conceptos', 'orden'],
  ['dias', 'horas', 'orden'], 'convenio'));

router.use('/obras-sociales', catalogo('sld_obra_social',
  ['descripcion', 'aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'],
  ['aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'], 'obra social'));

router.use('/sindicatos', catalogo('sld_sindicato',
  ['descripcion', 'aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'],
  ['aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'], 'sindicato'));

router.use('/situacion-revista',    catalogo('sld_situacion_revista',  ['descripcion', 'orden'], ['orden'], 'situación de revista'));
router.use('/condiciones-laborales', catalogo('sld_condicion_laboral', ['descripcion', 'orden'], ['orden'], 'condición laboral'));
router.use('/actividades-laborales', catalogo('sld_actividad_laboral', ['descripcion', 'orden'], ['orden'], 'actividad laboral'));
router.use('/modalidades-contrato', catalogo('sld_modalidad_contrato', ['descripcion', 'orden'], ['orden'], 'modalidad de contratación'));
router.use('/incapacidades',        catalogo('sld_incapacidad',        ['descripcion', 'orden'], ['orden'], 'incapacidad'));
router.use('/codigos-zona',         catalogo('sld_codigo_zona',        ['descripcion', 'orden'], ['orden'], 'código de zona'));

router.use('/tipos-novedad', catalogo('sld_tipo_novedad',
  ['descripcion', 'data_type', 'length', 'decimals', 'orden'],
  ['length', 'decimals', 'orden'], 'tipo de novedad'));

router.use('/campos-historial', catalogo('sld_campo_historial',
  ['descripcion', 'data_type', 'length', 'decimals', 'orden'],
  ['length', 'decimals', 'orden'], 'campo de historial'));

router.use('/motivos-ausentismo', catalogo('sld_motivo_ausentismo',
  ['tipo', 'descripcion', 'simbolo', 'orden'], ['orden'], 'motivo de ausentismo'));

router.use('/feriados', catalogo('sld_feriado',
  ['descripcion'], [], 'feriado', { idColumn: 'fecha' }));

router.use('/monedas', catalogo('bas_moneda',
  ['nombre', 'simbolo', 'simbolos', 'cotizacion', 'color', 'icono', 'orden'],
  ['cotizacion', 'orden'], 'moneda'));

router.use('/localidades', catalogo('bas_localidad',
  ['zona', 'provincia', 'cpa'], [], 'localidad', { idColumn: 'localidad' }));

router.use('/paises', catalogo('bas_pais',
  ['pais'], [], 'país', { idColumn: 'codigo' }));

router.use('/proyectos', catalogo('bas_proyecto',
  ['descripcion', 'grupo', 'fecha', 'fecha_fin', 'horas', 'valor_hora', 'presupuesto',
   'ejecutado', 'avance', 'moneda', 'observaciones', 'alias', 'color', 'orden', 'visible', 'id_padre'],
  ['horas', 'valor_hora', 'presupuesto', 'ejecutado', 'avance', 'orden'], 'proyecto'));

router.use('/formulas', catalogo('sld_formula_auxiliar',
  ['descripcion', 'formato', 'formula', 'orden'], ['orden'], 'fórmula'));

router.use('/grupos-de-conceptos', catalogo('sld_grupo_de_conceptos',
  ['descripcion', 'orden'], ['orden'], 'grupo de conceptos'));

const clasesConceptoRouter = catalogo('sld_clase', ['descripcion', 'orden'], ['orden'], 'clase de concepto');
const claseGrupoController = require('../controllers/claseGrupo');
clasesConceptoRouter.get   ('/:id/grupos', claseGrupoController.list);
clasesConceptoRouter.post  ('/:id/grupos', claseGrupoController.create);
clasesConceptoRouter.delete('/:id/grupos/:grupo', claseGrupoController.remove);
router.use('/clases-concepto', clasesConceptoRouter);

const TABLA_COLUMNAS = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(n =>
  [`column_${n}`, `data_type_${n}`, `length_${n}`, `decimals_${n}`]);
const TABLA_NUMERICAS = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(n => [`length_${n}`, `decimals_${n}`]);

const tiposTablaRouter = catalogo('sld_tabla',
  ['descripcion', ...TABLA_COLUMNAS, 'orden'], [...TABLA_NUMERICAS, 'orden'], 'tipo de tabla');
const filaController = require('../controllers/fila');
tiposTablaRouter.get   ('/:id/filas', filaController.list);
tiposTablaRouter.post  ('/:id/filas', filaController.create);
tiposTablaRouter.delete('/:id/filas/:fila', filaController.remove);
router.use('/tipos-tabla', tiposTablaRouter);

router.use('/conceptos', require('./conceptos'));
router.use('/conceptos-general', require('./conceptoGeneral'));

const FORMULARIO_COLUMNS = [
  'descripcion', 'orientacion', 'pagina', 'margen_superior', 'margen_inferior', 'margen_izquierdo',
  'margen_derecho', 'formulario_hermano', 'formula_archivo', 'columnas', 'filas', 'copias',
  'propiedad', 'etiquetas', 'orden',
];
const FORMULARIO_NUMERIC = ['margen_superior', 'margen_inferior', 'margen_izquierdo', 'margen_derecho', 'columnas', 'filas', 'copias', 'orden'];

const { createParametroModel } = require('../models/formularioParametro');
const { createParametroController } = require('../controllers/formularioParametro');

function formularioRouter(tableName, parametroTable) {
  const router = catalogo(tableName, FORMULARIO_COLUMNS, FORMULARIO_NUMERIC, 'formulario');
  const parametroController = createParametroController(createParametroModel(parametroTable));
  router.get('/:id/parametros', parametroController.list);
  router.post('/:id/parametros', parametroController.create);
  router.delete('/:id/parametros/:parametro', parametroController.remove);
  return router;
}

router.use('/informes/formularios-recibo', formularioRouter('sld_formulario_recibo', 'sld_formulario_recibo_parametro'));
router.use('/informes/formularios-libro', formularioRouter('sld_formulario_libro', 'sld_formulario_libro_parametro'));

module.exports = router;
