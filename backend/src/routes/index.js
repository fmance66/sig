const express = require('express');
const router  = express.Router();

const { requireAuth, requireModulo, requireModuloEscritura } = require('../middleware/auth');

const { createCatalogoModel }      = require('../models/catalogo');
const { createCatalogoController } = require('../controllers/catalogo');
const { createCatalogoRouter }     = require('./catalogo');

function catalogo(tableName, columns, numericColumns, nombreEntidad, options) {
  const model      = createCatalogoModel(tableName, columns, numericColumns, options);
  const controller = createCatalogoController(model, nombreEntidad);
  return createCatalogoRouter(controller);
}

// Login/logout/me: público, no requiere sesión.
router.use('/auth', require('./auth'));

// Todo lo que sigue exige sesión iniciada.
router.use(requireAuth);

// Monta un router bajo `path`, exigiendo además permiso sobre `moduloId`
// (ver=GET, crear=POST, editar=PUT/PATCH, eliminar=DELETE — ver middleware/auth.js).
function mod(path, moduloId, handler) {
  router.use(path, requireModulo(moduloId), handler);
}

router.use('/estado',    require('./estado'));     // sin gate de módulo, solo sesión
router.use('/dashboard', require('./dashboard'));   // ídem

// GET abierto a cualquier usuario logueado (lo usa el selector de empresa
// desde cualquier módulo); crear/editar/eliminar sigue exigiendo 'configuracion'.
router.use('/empresas', requireModuloEscritura('configuracion'), require('./empresas'));
mod('/backup',    'configuracion', require('./backup'));
mod('/sucursales', 'configuracion', require('./sucursales'));

mod('/empleados', 'sueldos', require('./empleados'));
mod('/familiares', 'sueldos', require('./familiares'));
mod('/novedades', 'sueldos', require('./novedades'));
mod('/novedades-automaticas', 'sueldos', require('./novedadesAutomaticas'));
mod('/historial', 'sueldos', require('./historial'));
mod('/historial-empleado', 'sueldos', require('./historialEmpleado'));
mod('/historial-automatico', 'sueldos', require('./historialAutomatico'));
mod('/ausentismos', 'sueldos', require('./ausentismo'));
mod('/presentismos', 'sueldos', require('./presentismo'));
mod('/jornada-laboral', 'sueldos', require('./jornadaLaboral'));
mod('/conceptos-empleado', 'sueldos', require('./conceptosEmpleado'));
mod('/conceptos-grupo', 'sueldos', require('./conceptosGrupo'));
mod('/liquidaciones', 'sueldos', require('./liquidaciones'));
mod('/recibos', 'sueldos', require('./recibos'));
mod('/recibos-automaticos', 'sueldos', require('./recibosAutomaticos'));
mod('/recibos-recalculados', 'sueldos', require('./recibosRecalculados'));
mod('/listado-contribuciones', 'sueldos', require('./contribuciones'));
mod('/informes', 'sueldos', require('./informes'));

mod('/convenios', 'configuracion', catalogo('sld_convenio',
  ['descripcion', 'liquidacion', 'dias', 'horas', 'moneda', 'obra_social', 'grupo_de_conceptos', 'orden'],
  ['dias', 'horas', 'orden'], 'convenio'));

mod('/obras-sociales', 'configuracion', catalogo('sld_obra_social',
  ['descripcion', 'aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'],
  ['aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'], 'obra social'));

mod('/sindicatos', 'configuracion', catalogo('sld_sindicato',
  ['descripcion', 'aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'],
  ['aporte_porcentaje', 'aporte_importe', 'retencion_porcentaje', 'retencion_importe', 'orden'], 'sindicato'));

mod('/situacion-revista',    'configuracion', catalogo('sld_situacion_revista',  ['descripcion', 'orden'], ['orden'], 'situación de revista'));
mod('/condiciones-laborales', 'configuracion', catalogo('sld_condicion_laboral', ['descripcion', 'orden'], ['orden'], 'condición laboral'));
mod('/actividades-laborales', 'configuracion', catalogo('sld_actividad_laboral', ['descripcion', 'orden'], ['orden'], 'actividad laboral'));
mod('/modalidades-contrato', 'configuracion', catalogo('sld_modalidad_contrato', ['descripcion', 'orden'], ['orden'], 'modalidad de contratación'));
mod('/incapacidades',        'configuracion', catalogo('sld_incapacidad',        ['descripcion', 'orden'], ['orden'], 'incapacidad'));
mod('/codigos-zona',         'configuracion', catalogo('sld_codigo_zona',        ['descripcion', 'orden'], ['orden'], 'código de zona'));

mod('/tipos-novedad', 'sueldos', catalogo('sld_tipo_novedad',
  ['descripcion', 'data_type', 'length', 'decimals', 'orden'],
  ['length', 'decimals', 'orden'], 'tipo de novedad'));

mod('/campos-historial', 'sueldos', catalogo('sld_campo_historial',
  ['descripcion', 'data_type', 'length', 'decimals', 'orden'],
  ['length', 'decimals', 'orden'], 'campo de historial'));

mod('/motivos-ausentismo', 'sueldos', catalogo('sld_motivo_ausentismo',
  ['tipo', 'descripcion', 'simbolo', 'orden'], ['orden'], 'motivo de ausentismo'));

mod('/feriados', 'sueldos', catalogo('sld_feriado',
  ['descripcion'], [], 'feriado', { idColumn: 'fecha' }));

mod('/monedas', 'configuracion', catalogo('bas_moneda',
  ['nombre', 'simbolo', 'simbolos', 'cotizacion', 'color', 'icono', 'orden'],
  ['cotizacion', 'orden'], 'moneda'));

mod('/localidades', 'configuracion', catalogo('bas_localidad',
  ['zona', 'provincia', 'cpa'], [], 'localidad', { idColumn: 'localidad' }));

mod('/paises', 'configuracion', catalogo('bas_pais',
  ['pais'], [], 'país', { idColumn: 'codigo' }));

mod('/proyectos', 'configuracion', catalogo('bas_proyecto',
  ['descripcion', 'grupo', 'fecha', 'fecha_fin', 'horas', 'valor_hora', 'presupuesto',
   'ejecutado', 'avance', 'moneda', 'observaciones', 'alias', 'color', 'orden', 'visible', 'id_padre'],
  ['horas', 'valor_hora', 'presupuesto', 'ejecutado', 'avance', 'orden'], 'proyecto'));

mod('/formulas', 'sueldos', catalogo('sld_formula_auxiliar',
  ['descripcion', 'formato', 'formula', 'orden'], ['orden'], 'fórmula'));

mod('/grupos-de-conceptos', 'sueldos', catalogo('sld_grupo_de_conceptos',
  ['descripcion', 'orden'], ['orden'], 'grupo de conceptos'));

const clasesConceptoRouter = catalogo('sld_clase', ['descripcion', 'orden'], ['orden'], 'clase de concepto');
const claseGrupoController = require('../controllers/claseGrupo');
clasesConceptoRouter.get   ('/:id/grupos', claseGrupoController.list);
clasesConceptoRouter.post  ('/:id/grupos', claseGrupoController.create);
clasesConceptoRouter.delete('/:id/grupos/:grupo', claseGrupoController.remove);
mod('/clases-concepto', 'sueldos', clasesConceptoRouter);

const TABLA_COLUMNAS = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(n =>
  [`column_${n}`, `data_type_${n}`, `length_${n}`, `decimals_${n}`]);
const TABLA_NUMERICAS = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(n => [`length_${n}`, `decimals_${n}`]);

const tiposTablaRouter = catalogo('sld_tabla',
  ['descripcion', ...TABLA_COLUMNAS, 'orden'], [...TABLA_NUMERICAS, 'orden'], 'tipo de tabla');
const filaController = require('../controllers/fila');
tiposTablaRouter.get   ('/:id/filas', filaController.list);
tiposTablaRouter.post  ('/:id/filas', filaController.create);
tiposTablaRouter.delete('/:id/filas/:fila', filaController.remove);
mod('/tipos-tabla', 'sueldos', tiposTablaRouter);

mod('/conceptos', 'sueldos', require('./conceptos'));
mod('/conceptos-general', 'sueldos', require('./conceptoGeneral'));

const { createFormularioModel } = require('../models/formulario');
const { createFormularioController } = require('../controllers/formulario');
const { createParametroModel } = require('../models/formularioParametro');
const { createParametroController } = require('../controllers/formularioParametro');

function formularioRouter(tableName, parametroTable, extraColumns = []) {
  const controller = createFormularioController(createFormularioModel(tableName, extraColumns), 'formulario');
  const router = createCatalogoRouter(controller);
  if (extraColumns.includes('activo')) router.put('/:id/activar', controller.activar);
  const parametroController = createParametroController(createParametroModel(parametroTable));
  router.get('/:id/parametros', parametroController.list);
  router.post('/:id/parametros', parametroController.create);
  router.put('/:id/parametros/:parametro', parametroController.update);
  router.delete('/:id/parametros/:parametro', parametroController.remove);
  return router;
}

mod('/informes/formularios-recibo', 'sueldos', formularioRouter('sld_formulario_recibo', 'sld_formulario_recibo_parametro', ['activo', 'ley_27802']));
mod('/informes/formularios-libro', 'sueldos', formularioRouter('sld_formulario_libro', 'sld_formulario_libro_parametro'));

mod('/usuarios', 'seguridad', require('./usuarios'));
mod('/grupos',   'seguridad', require('./grupos'));
mod('/sesiones', 'seguridad', require('./sesiones'));

module.exports = router;
