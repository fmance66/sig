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
router.use('/historial', require('./historial'));
router.use('/conceptos-empleado', require('./conceptosEmpleado'));
router.use('/conceptos-grupo', require('./conceptosGrupo'));

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

router.use('/monedas', catalogo('bas_moneda',
  ['nombre', 'simbolo', 'simbolos', 'cotizacion', 'color', 'icono', 'orden'],
  ['cotizacion', 'orden'], 'moneda'));

router.use('/localidades', catalogo('bas_localidad',
  ['zona', 'provincia', 'cpa'], [], 'localidad', { idColumn: 'localidad' }));

router.use('/paises', catalogo('bas_pais',
  ['codigo'], [], 'país', { idColumn: 'pais' }));

router.use('/proyectos', catalogo('bas_proyecto',
  ['descripcion', 'grupo', 'fecha', 'fecha_fin', 'horas', 'valor_hora', 'presupuesto',
   'ejecutado', 'avance', 'moneda', 'observaciones', 'alias', 'color', 'orden', 'visible', 'id_padre'],
  ['horas', 'valor_hora', 'presupuesto', 'ejecutado', 'avance', 'orden'], 'proyecto'));

module.exports = router;
