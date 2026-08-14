const express = require('express');
const router = express.Router();
const controller = require('../controllers/informes');
const personalizados = require('../controllers/informePersonalizado');

router.get('/conceptos-acumulados',  controller.conceptosAcumulados);
router.get('/conceptos-por-grupo',   controller.conceptosPorGrupo);
router.get('/conceptos-por-empleado', controller.conceptosPorEmpleado);
router.get('/conceptos-por-recibo',  controller.conceptosPorRecibo);

router.get('/remuneracion-por-conceptos', controller.remuneracionPorConceptos);
router.get('/remuneracion-por-empleados', controller.remuneracionPorEmpleados);
router.get('/remuneracion-por-grupos',    controller.remuneracionPorGrupos);

router.get('/recibos-sueldo', controller.recibosSueldo);
router.get('/recibos-sueldo/pdf', controller.recibosSueldoPdf);
router.get('/libro-sueldos/pdf', controller.libroSueldoPdf);

router.get('/personalizados-campos-disponibles', personalizados.camposDisponibles);

router.get('/personalizados', personalizados.list);
router.post('/personalizados', personalizados.create);
router.get('/personalizados/:id', personalizados.getOne);
router.put('/personalizados/:id', personalizados.update);
router.delete('/personalizados/:id', personalizados.remove);
router.get('/personalizados/:id/campos', personalizados.listCampos);
router.post('/personalizados/:id/campos', personalizados.addCampo);
router.delete('/personalizados/:id/campos/:campo', personalizados.removeCampo);
router.get('/personalizados/:id/ejecutar', personalizados.ejecutar);

module.exports = router;
