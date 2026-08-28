const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard');

router.get('/global', controller.global);
router.get('/', controller.resumen); // ?empresa=

module.exports = router;
