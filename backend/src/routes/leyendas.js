const express = require('express');
const router  = express.Router();
const controller = require('../controllers/leyendas');

router.get   ('/',             controller.list); // ?empresa=id
router.get   ('/:id/:empresa', controller.getOne);
router.post  ('/',             controller.create);
router.put   ('/:id/:empresa', controller.update);
router.delete('/:id/:empresa', controller.remove);

module.exports = router;
