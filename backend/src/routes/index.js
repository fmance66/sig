const express = require('express');
const router  = express.Router();

router.use('/estado',    require('./estado'));
router.use('/empresas',  require('./empresas'));
router.use('/empleados', require('./empleados'));
router.use('/sucursales', require('./sucursales'));

module.exports = router;
