// Vocabulario de "Fórmulas de Asiento" (cnt_modelo_asiento/cnt_formula_movimiento)
// para el motor genérico de formulaEngine.js. Cubre los 4 modelos reales
// migrados de Master (ASIENTO_COMPRA, ASIENTO_VENTA, COBRO_ASIENTO,
// PAGO_ASIENTO) — variables de totales de comprobante/cobro/pago y la
// función IMPUESTOS(tag) que suma las líneas de impuesto de esa categoría.
//
// No cubre variables de otros grupos legacy fuera de alcance de IVA (SUELDOS,
// DEPOSITO) ni la función ENTRADA() que usa DEPOSITO — se agregan si en algún
// momento se construye ese módulo.

const { evaluateFormula } = require('./formulaEngine');

const VARIABLES = new Set([
  // Comunes a los 4 modelos
  'PERIODO', 'FECHA', 'FECHA_EJERCICIO',
  // Comprobante de compra/venta (iva_comprobante)
  'COMPROBANTE', 'TIPO_DESCRIPCION', 'NUMERO', 'RUBRO',
  'IMPORTE_TOTAL', 'IVA_TOTAL', 'NETO_TOTAL', 'NOGRAVADO_TOTAL', 'EXENTO_TOTAL',
  // Cobro
  'COBRO', 'COBRO_TOTAL', 'CAJA_TOTAL', 'CUENTA_TOTAL', 'TARJETA_TOTAL', 'CHEQUE3RO_TOTAL',
  // Pago
  'PAGO', 'PAGO_TOTAL', 'CHEQUE_TOTAL', 'CHEQUE3RO_SALIDA',
]);

const FUNCTIONS = {
  // IMPUESTOS(IVA) / IMPUESTOS(IIBB) / IMPUESTOS(OTROS): suma de las líneas de
  // impuesto del comprobante que caen en esa categoría. "IVA"/"IIBB"/"OTROS"
  // son etiquetas fijas (mode:'ident'), no variables de contexto.
  IMPUESTOS: {
    mode: 'ident',
    apply(args, context) {
      if (!context.sumImpuesto) return 0;
      return Number(context.sumImpuesto(args[0])) || 0;
    },
  },
};

const ASIENTO_ENGINE = { variables: VARIABLES, functions: FUNCTIONS, aliases: {} };

// context = { variables: {...}, sumImpuesto: (tag) => number }
function evaluateAsientoFormula(expression, context = {}) {
  return evaluateFormula(expression, context, ASIENTO_ENGINE);
}

module.exports = { evaluateAsientoFormula, ASIENTO_ENGINE, VARIABLES, FUNCTIONS };
