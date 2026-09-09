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

// Variante para catálogos con clave compuesta (ej. ['id','empresa'], mismo espíritu
// que sld_concepto) — la ruta de item pasa a ser /:id/:empresa en vez de /:id.
function createCatalogoRouterCompuesto(controller, idParams) {
  const router = express.Router();
  const itemPath = '/' + idParams.map(p => `:${p}`).join('/');
  router.get   ('/',      controller.list); // filtros por query (ver filtroParams)
  router.get   (itemPath, controller.getOne);
  router.post  ('/',      controller.create);
  router.put   (itemPath, controller.update);
  router.delete(itemPath, controller.remove);
  return router;
}

module.exports = { createCatalogoRouter, createCatalogoRouterCompuesto };
