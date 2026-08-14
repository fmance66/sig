const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/jornadaLaboral');

router.get   ('/',           controller.list);
router.get   ('/:empleado',  controller.getOne);
router.post  ('/',           controller.create);
router.put   ('/:empleado',  controller.update);
router.delete('/:empleado',  controller.remove);

module.exports = router;
