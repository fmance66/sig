const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/familiares');

router.get   ('/',              controller.list);   // ?empleado=1
router.post  ('/',              controller.create);
router.put   ('/:empleado/:id', controller.update);
router.delete('/:empleado/:id', controller.remove);

module.exports = router;
