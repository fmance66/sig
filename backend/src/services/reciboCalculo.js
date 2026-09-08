// Orquesta el cálculo de un recibo: recorre sld_recibo_concepto (ordenado por
// sld_concepto.orden), evalúa formula_condicion/formula_unidad/formula_importe con el
// motor acotado (backend/src/lib/formulaEngine.js) y recalcula los totales de cabecera
// de sld_recibo. Si una fórmula usa algo fuera del alcance soportado, la fila cae a sus
// valores manuales (unidad_manual/importe_manual) marcada con warning, sin romper el resto
// del recibo.
const pool = require('../config/db');
const { evaluateFormula, UnsupportedFormulaError, FormulaSyntaxError } = require('../lib/formulaEngine');

const COLUMNAS = ['REMUNERATIVO', 'NO_REMUNERATIVO', 'DESCUENTO', 'CONTRIBUCION', 'AUXILIAR'];

function diffMeses(desde, hasta) {
  if (!desde || !hasta) return 0;
  return (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
}

function diffDias(desde, hasta) {
  if (!desde || !hasta) return 0;
  return Math.floor((hasta.getTime() - desde.getTime()) / 86400000);
}

async function buildBaseVariables(recibo, liquidacion, empleado) {
  let horasConvenio = 0;
  if (empleado.convenio) {
    const { rows } = await pool.query('SELECT horas FROM sld_convenio WHERE id = $1', [empleado.convenio]);
    horasConvenio = Number(rows[0]?.horas) || 0;
  }

  const fecha = recibo.fecha_recibo || liquidacion?.fecha || null;
  const fechaIngreso = empleado.fecha_ingreso || null;
  const meses = fechaIngreso && fecha ? diffMeses(new Date(fechaIngreso), new Date(fecha)) : 0;
  const dias = fechaIngreso && fecha ? diffDias(new Date(fechaIngreso), new Date(fecha)) : 0;

  return {
    NUMERO_RECIBO: recibo.numero,
    FECHA: fecha ? new Date(fecha) : null,
    FECHA_DESDE: liquidacion?.fecha_desde ? new Date(liquidacion.fecha_desde) : null,
    FECHA_HASTA: liquidacion?.fecha_hasta ? new Date(liquidacion.fecha_hasta) : null,
    SUELDO: Number(empleado.sueldo) || 0,
    ADICIONAL: Number(empleado.adicional) || 0,
    DIAS: Number(empleado.dias) || 0,
    HORAS: Number(empleado.horas) || 0,
    HORAS_CONVENIO: horasConvenio,
    ANTIGUEDAD: Math.floor(meses / 12),
    ANTIGUEDAD_MESES: meses,
    ANTIGUEDAD_DIAS: dias,
    EMPLEADO_JORNAL: empleado.liquidacion === 'JORNAL',
  };
}

/**
 * Calcula (o recalcula) un recibo completo: evalúa cada renglón de sld_recibo_concepto
 * y actualiza los totales de sld_recibo. Devuelve { recibo, conceptos } con los valores
 * ya persistidos.
 */
async function calcularRecibo(periodo, empleado, numero) {
  const reciboRes = await pool.query(
    'SELECT * FROM sld_recibo WHERE periodo = $1 AND empleado = $2 AND numero = $3',
    [periodo, empleado, numero]
  );
  const recibo = reciboRes.rows[0];
  if (!recibo) return null;

  const [liquidacionRes, empleadoRes, conceptosRes] = await Promise.all([
    pool.query('SELECT * FROM sld_liquidacion WHERE periodo = $1 AND empresa = $2', [periodo, recibo.empresa]),
    pool.query('SELECT * FROM sld_empleado WHERE id = $1', [empleado]),
    pool.query(
      `SELECT rc.concepto, rc.unidad_manual, rc.importe_manual,
              c.columna, c.orden AS concepto_orden, c.descripcion AS concepto_desc,
              c.formula_unidad, c.formula_importe, c.formula_condicion
       FROM sld_recibo_concepto rc
       JOIN sld_concepto c ON c.id = rc.concepto AND c.empresa = rc.empresa
       WHERE rc.periodo = $1 AND rc.empleado = $2 AND rc.numero = $3
       ORDER BY c.orden NULLS LAST, c.id`,
      [periodo, empleado, numero]
    ),
  ]);

  const liquidacion = liquidacionRes.rows[0] ?? null;
  const empleadoRow = empleadoRes.rows[0];
  if (!empleadoRow) return null;

  const baseVariables = await buildBaseVariables(recibo, liquidacion, empleadoRow);
  const rows = conceptosRes.rows;
  const rowById = new Map(rows.map(r => [r.concepto, r]));

  const totals = { REMUNERATIVO: 0, NO_REMUNERATIVO: 0, DESCUENTO: 0, CONTRIBUCION: 0, AUXILIAR: 0 };
  const resultCache = new Map();
  const resolving = new Set();

  function currentVariables() {
    const sueldoBruto = totals.REMUNERATIVO + totals.NO_REMUNERATIVO;
    return {
      ...baseVariables,
      TOTAL_REMUNERATIVO: totals.REMUNERATIVO,
      TOTAL_NO_REMUNERATIVO: totals.NO_REMUNERATIVO,
      TOTAL_DESCUENTO: totals.DESCUENTO,
      TOTAL_CONTRIBUCION: totals.CONTRIBUCION,
      SUELDO_BRUTO: sueldoBruto,
      SUELDO_NETO: sueldoBruto - totals.DESCUENTO,
    };
  }

  function resolveConcepto(id) {
    if (resultCache.has(id)) return resultCache.get(id).importe;
    if (resolving.has(id)) return 0; // referencia circular: se corta
    const row = rowById.get(id);
    if (!row) return 0;
    return computeRow(row).importe;
  }

  function computeRow(row) {
    const manualUnidad = row.unidad_manual !== null ? Number(row.unidad_manual) : 0;
    const manualImporte = row.importe_manual !== null ? Number(row.importe_manual) : 0;

    resolving.add(row.concepto);
    let result;
    try {
      const varsBase = { ...currentVariables(), UNIDAD_MANUAL: manualUnidad, IMPORTE_MANUAL: manualImporte };

      const unidadEval = evaluateFormula(row.formula_unidad, { variables: { ...varsBase, UNIDAD: 0 }, resolveConcepto });
      const unidad = unidadEval === null ? manualUnidad : Number(unidadEval) || 0;

      const condicionEval = evaluateFormula(row.formula_condicion, { variables: { ...varsBase, UNIDAD: unidad }, resolveConcepto });
      const condicion = condicionEval === null ? true : Boolean(condicionEval);

      let importe = 0;
      if (condicion) {
        const importeEval = evaluateFormula(row.formula_importe, { variables: { ...varsBase, UNIDAD: unidad }, resolveConcepto });
        importe = importeEval === null ? manualImporte : Number(importeEval) || 0;
      }

      result = { unidad, importe, condicion, warning: false, error: false, message: null };
    } catch (err) {
      if (err instanceof UnsupportedFormulaError || err instanceof FormulaSyntaxError) {
        result = {
          unidad: manualUnidad, importe: manualImporte, condicion: true,
          warning: true, error: false,
          message: `Fórmula no soportada (${err.name === 'UnsupportedFormulaError' ? err.token : 'sintaxis'}), se usó carga manual.`,
        };
      } else {
        result = { unidad: manualUnidad, importe: manualImporte, condicion: true, warning: false, error: true, message: err.message };
      }
    }
    // Redondear a centavos acá (no solo al guardar en la columna NUMERIC(12,2)):
    // los totales de cabecera y las referencias cruzadas (#id) tienen que sumar
    // los mismos valores que ve el usuario en cada renglón, no el float sin
    // redondear de la fórmula — si no, el total termina un par de centavos
    // distinto de la suma manual de los renglones mostrados.
    result.importe = Math.round(result.importe * 100) / 100;
    resolving.delete(row.concepto);
    resultCache.set(row.concepto, result);
    return result;
  }

  const conceptos = [];
  for (const row of rows) {
    const result = resultCache.has(row.concepto) ? resultCache.get(row.concepto) : computeRow(row);
    if (COLUMNAS.includes(row.columna)) totals[row.columna] += result.importe;
    conceptos.push({ concepto: row.concepto, descripcion: row.concepto_desc, columna: row.columna, ...result });
  }

  await Promise.all(conceptos.map(c => pool.query(
    `UPDATE sld_recibo_concepto
     SET unidad = $1, importe = $2, unitario = $3, condicion = $4, warning = $5, error = $6, message = $7
     WHERE periodo = $8 AND empleado = $9 AND numero = $10 AND concepto = $11`,
    [c.unidad, c.importe, c.unidad ? c.importe / c.unidad : null, c.condicion, c.warning, c.error, c.message,
      periodo, empleado, numero, c.concepto]
  )));

  const sueldoBruto = totals.REMUNERATIVO + totals.NO_REMUNERATIVO;
  const sueldoNeto = sueldoBruto - totals.DESCUENTO;
  const costoLaboral = sueldoBruto + totals.CONTRIBUCION;

  const { rows: updated } = await pool.query(
    `UPDATE sld_recibo
     SET remunerativo = $1, no_remunerativo = $2, descuento = $3,
         sueldo_bruto = $4, sueldo_neto = $5, contribucion = $6, costo_laboral = $7
     WHERE periodo = $8 AND empleado = $9 AND numero = $10
     RETURNING *`,
    [totals.REMUNERATIVO, totals.NO_REMUNERATIVO, totals.DESCUENTO,
      sueldoBruto, sueldoNeto, totals.CONTRIBUCION, costoLaboral,
      periodo, empleado, numero]
  );

  return { recibo: updated[0], conceptos };
}

module.exports = { calcularRecibo };
