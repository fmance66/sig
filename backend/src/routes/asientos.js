const express = require('express');
const router  = express.Router();
const controller = require('../controllers/asientos');

router.get   ('/',                                    controller.list); // ?empresa=&ejercicio=&cuenta=&leyenda=
router.get   ('/desbalanceados',                      controller.desbalanceados); // ?empresa=&ejercicio=
router.get   ('/:ejercicio/:numero/:empresa/movimientos', controller.getMovimientos);
router.post  ('/',                                    controller.create);
router.put   ('/union',                               controller.union);
router.put   ('/renumerar',                           controller.renumerar);
router.put   ('/:ejercicio/:numero/:empresa',         controller.update);
router.delete('/:ejercicio/:numero/:empresa',         controller.remove);

module.exports = router;
