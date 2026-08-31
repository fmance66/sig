const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/sesiones');

router.get   ('/',     controller.list);
router.delete('/:sid', controller.remove);

module.exports = router;
