const express = require('express');

function createCatalogoRouter(controller) {
  const router = express.Router();
  router.get   ('/',    controller.list);
  router.get   ('/:id', controller.getOne);
  router.post  ('/',    controller.create);
  router.put   ('/:id', controller.update);
  router.delete('/:id', controller.remove);
  return router;
}

module.exports = { createCatalogoRouter };
