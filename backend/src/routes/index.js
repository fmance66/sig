const express = require('express');
const router  = express.Router();

router.use('/estado',    require('./estado'));
router.use('/empresas',  require('./empresas'));
router.use('/empleados', require('./empleados'));
router.use('/sucursales', require('./sucursales'));
router.use('/familiares', require('./familiares'));
router.use('/novedades', require('./novedades'));
router.use('/historial', require('./historial'));
router.use('/conceptos-empleado', require('./conceptosEmpleado'));
router.use('/conceptos-grupo', require('./conceptosGrupo'));

module.exports = router;
