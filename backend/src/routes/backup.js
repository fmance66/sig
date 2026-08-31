const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/backup');

// El dump viaja como texto plano SQL, no JSON — mismo criterio que el logo
// de empresa (raw body) pero con un límite bien alto porque un dump puede
// pesar bastante más que una imagen.
const rawSql = express.text({ type: '*/*', limit: '300mb' });

router.get ('/generar',   controller.generar);
router.post('/restaurar', rawSql, controller.restaurar);

module.exports = router;
