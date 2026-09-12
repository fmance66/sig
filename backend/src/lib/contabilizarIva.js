// "Contabilizar asientos" / "Recalcular comprobantes" (menú Períodos de I.V.A.) —
// genera asientos contables reales a partir de los comprobantes de un período,
// usando el motor de fórmulas de asiento (formulaEngineAsiento.js) y los modelos
// configurados en cnt_modelo_asiento/cnt_formula_movimiento.
//
// Los 4 modelos reales (ASIENTO_COMPRA/VENTA/COBRO/PAGO) tienen unir_asientos=true
// y combinar_cuentas=true: se genera UN asiento por (período+modelo) que agrupa
// todos los comprobantes candidatos, sumando por cuenta. "Contabilizar" toma los
// comprobantes sin asiento todavía; "Recalcular" borra el/los asientos ya
// generados para el período y los rehace desde cero con todos los comprobantes.
//
// Fuera de alcance a propósito (ver project_iva_gaps_pendientes /
// project_motor_formulas_asiento_contabilidad): grupos COBRO/PAGO (no existe
// todavía la fuente de datos de cobros/pagos en este sistema), prorrateo por
// centro de costo (cnt_movimiento no tiene columna para persistirlo, y los 6
// dumps legacy no tienen filas reales de cnt_formula_centro_costo), dividir_rubro/
// dividir_proyecto/dividir_imputable (false en los 4 modelos reales) y pesificar
// (sin cotización de moneda extranjera en los datos reales de IVA).

const pool = require('../config/db');
const Asiento = require('../models/asientos');
const { evaluateAsientoFormula } = require('./formulaEngineAsiento');

const GRUPO_POR_MODULO = { COMPRA: 'IVA_COMPRA', VENTA: 'IVA_VENTA' };

function errorHttp(mensaje, status = 400) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

async function getPeriodo(periodo, empresa) {
  const { rows } = await pool.query(
    'SELECT periodo, empresa, fecha_desde, fecha_hasta, modulo_activo FROM iva_liquidacion WHERE periodo = $1 AND empresa = $2',
    [periodo, empresa]
  );
  return rows[0] ?? null;
}

async function sumasImpuestoPorComprobante(c) {
  const { rows } = await pool.query(
    `SELECT i.grupo, SUM(ci.importe) AS total
       FROM iva_comprobante_impuesto ci
       JOIN iva_impuesto i ON i.id = ci.impuesto AND i.empresa = ci.empresa
      WHERE ci.modulo = $1 AND ci.tipo = $2 AND ci.comprobante = $3 AND ci.persona = $4 AND ci.empresa = $5
        AND i.grupo IS NOT NULL AND i.grupo <> ''
      GROUP BY i.grupo`,
    [c.modulo, c.tipo, c.comprobante, c.persona, c.empresa]
  );
  const sumas = {};
  for (const r of rows) sumas[r.grupo] = Number(r.total) || 0;
  return sumas;
}

function contextoComprobante(c, sumas, { periodo, fechaAsiento, fechaEjercicio }) {
  return {
    variables: {
      PERIODO: periodo,
      FECHA: fechaAsiento,
      FECHA_EJERCICIO: fechaEjercicio,
      COMPROBANTE: c.comprobante,
      TIPO_DESCRIPCION: c.tipo_descripcion,
      NUMERO: c.comprobante,
      RUBRO: c.rubro,
      IMPORTE_TOTAL: Number(c.total) || 0,
      IVA_TOTAL: Number(c.iva) || 0,
      NETO_TOTAL: Number(c.neto) || 0,
      NOGRAVADO_TOTAL: Number(c.nogravado) || 0,
      EXENTO_TOTAL: Number(c.exento) || 0,
    },
    sumImpuesto: (tag) => sumas[tag] || 0,
  };
}

// Genera (o regenera) el asiento único de un modelo para el lote de comprobantes
// dado, y actualiza el link asiento_ejercicio/asiento_numero en cada uno.
async function generarAsientoModelo({ modeloId, empresa, grupoEsperado, periodoRow, comprobantes }) {
  const { rows: modeloRows } = await pool.query(
    'SELECT * FROM cnt_modelo_asiento WHERE id = $1 AND empresa = $2', [modeloId, empresa]
  );
  const modelo = modeloRows[0];
  if (!modelo) throw errorHttp(`El modelo de asiento "${modeloId}" no existe para esta empresa`);
  if (modelo.grupo !== grupoEsperado) {
    throw errorHttp(`El modelo "${modeloId}" es de grupo ${modelo.grupo}, se esperaba ${grupoEsperado}`);
  }

  const { rows: lineas } = await pool.query(
    'SELECT * FROM cnt_formula_movimiento WHERE modelo = $1 AND empresa = $2 ORDER BY movimiento',
    [modeloId, empresa]
  );
  if (!lineas.length) throw errorHttp(`El modelo "${modeloId}" no tiene líneas de movimiento configuradas`);

  const fechaAsientoBase = periodoRow.fecha_hasta;
  const { rows: ejercicioRows } = await pool.query(
    'SELECT id, fecha_hasta FROM cnt_ejercicio WHERE empresa = $1 AND fecha_desde <= $2 AND fecha_hasta >= $2',
    [empresa, fechaAsientoBase]
  );
  const ejercicio = ejercicioRows[0];
  if (!ejercicio) throw errorHttp('No hay un ejercicio contable abierto que contenga la fecha de cierre del período');

  const fechaAsiento = modelo.fecha === 'FECHA_EJERCICIO' ? ejercicio.fecha_hasta : fechaAsientoBase;

  // condicion es a nivel de modelo (siempre vacía en los datos reales migrados):
  // si está configurada, se evalúa una sola vez con variables de período/ejercicio
  // (no hay comprobante todavía en este punto) y descarta el modelo entero si da false.
  if (modelo.condicion && modelo.condicion.trim()) {
    const contextoModelo = {
      variables: { PERIODO: periodoRow.periodo, FECHA: fechaAsiento, FECHA_EJERCICIO: ejercicio.fecha_hasta },
      sumImpuesto: () => 0,
    };
    if (!evaluateAsientoFormula(modelo.condicion, contextoModelo)) {
      throw errorHttp(`La condición del modelo "${modeloId}" no se cumple para este período`);
    }
  }

  const buckets = new Map(); // cuenta -> { debe, haber }
  const leyendas = [];

  for (const c of comprobantes) {
    const sumas = await sumasImpuestoPorComprobante(c);
    const contexto = contextoComprobante(c, sumas, {
      periodo: periodoRow.periodo, fechaAsiento, fechaEjercicio: ejercicio.fecha_hasta,
    });

    if (modelo.leyenda) {
      const texto = evaluateAsientoFormula(modelo.leyenda, contexto);
      if (texto) leyendas.push(String(texto));
    }

    for (const linea of lineas) {
      if (!linea.formula) continue;
      const valor = Number(evaluateAsientoFormula(linea.formula, contexto)) || 0;
      if (!valor) continue;
      let lado = linea.saldo;
      let monto = valor;
      if (modelo.asiento_negativo === 'INVERTIR' && valor < 0) {
        lado = lado === 'DEBE' ? 'HABER' : 'DEBE';
        monto = -valor;
      }
      if (!buckets.has(linea.cuenta)) buckets.set(linea.cuenta, { debe: 0, haber: 0 });
      const bucket = buckets.get(linea.cuenta);
      if (lado === 'HABER') bucket.haber += monto; else bucket.debe += monto;
    }
  }

  const movimientos = [];
  for (const [cuenta, { debe, haber }] of buckets) {
    const d = Math.round(debe * 100) / 100;
    const h = Math.round(haber * 100) / 100;
    if (d === 0 && h === 0) continue;
    movimientos.push({ cuenta, debe: d, haber: h });
  }
  if (movimientos.length < 2) {
    throw errorHttp(`Las fórmulas del modelo "${modeloId}" no generaron movimientos para este período`);
  }

  const leyendaFinal = (leyendas.length ? leyendas.join(', ') : modelo.descripcion || modeloId).slice(0, 256);
  const asiento = await Asiento.create({
    ejercicio: ejercicio.id,
    empresa,
    fecha: fechaAsiento,
    leyenda: leyendaFinal,
    tipo: 'OPERATIVO',
    movimientos,
  });

  for (const c of comprobantes) {
    await pool.query(
      `UPDATE iva_comprobante SET asiento_ejercicio = $1, asiento_numero = $2
        WHERE modulo = $3 AND tipo = $4 AND comprobante = $5 AND persona = $6 AND empresa = $7`,
      [asiento.ejercicio, asiento.numero, c.modulo, c.tipo, c.comprobante, c.persona, c.empresa]
    );
  }

  const totalDebe = movimientos.reduce((acc, m) => acc + m.debe, 0);
  return {
    modelo: modeloId, ejercicio: asiento.ejercicio, numero: asiento.numero,
    comprobantes: comprobantes.length, lineas: movimientos.length, total: Math.round(totalDebe * 100) / 100,
  };
}

// modo: 'nuevos' (Contabilizar asientos) | 'recalcular' (Recalcular comprobantes)
//
// `iva_liquidacion.modulo_activo` NO se usa para filtrar: en los datos reales
// migrados (Master y otras empresas) un período tiene comprobantes de Compra Y
// de Venta mezclados sin relación con ese campo (ej. Master 07/2025 tiene
// modulo_activo=COMPRA pero sus 2 únicos comprobantes reales son de VENTA) — es
// un campo de UI (última pestaña activa), no una restricción de datos. Por eso
// se procesan ambos módulos del período en la misma pasada.
async function contabilizarPeriodo({ periodo, empresa, modo }) {
  empresa = Number(empresa);
  const periodoRow = await getPeriodo(periodo, empresa);
  if (!periodoRow) throw errorHttp('Período no encontrado', 404);

  const { rows: comprobantes } = await pool.query(
    `SELECT c.*, tc.modelo_asiento_cmp, tc.modelo_asiento_vta, tc.descripcion AS tipo_descripcion
       FROM iva_comprobante c
       JOIN iva_tipo_comprobante tc ON tc.id = c.tipo AND tc.empresa = c.empresa
      WHERE c.periodo = $1 AND c.empresa = $2 AND c.anulado = false`,
    [periodo, empresa]
  );
  for (const c of comprobantes) {
    c.modelo = c.modulo === 'VENTA' ? c.modelo_asiento_vta : c.modelo_asiento_cmp;
  }

  const resultado = { comprobantesProcesados: 0, comprobantesOmitidos: [], asientosGenerados: [], errores: [] };
  if (!comprobantes.length) {
    resultado.errores.push('No hay comprobantes no anulados en este período');
    return resultado;
  }

  if (modo === 'recalcular') {
    const asientosPrevios = new Set();
    for (const c of comprobantes) {
      if (c.asiento_numero) asientosPrevios.add(`${c.asiento_ejercicio}|${c.asiento_numero}`);
    }
    // Desvincular antes de borrar: la FK es ON DELETE RESTRICT (ver migración 011),
    // así que hay que soltar el link a mano o el DELETE de abajo viola la constraint.
    await pool.query(
      'UPDATE iva_comprobante SET asiento_ejercicio = NULL, asiento_numero = NULL WHERE periodo = $1 AND empresa = $2',
      [periodo, empresa]
    );
    for (const key of asientosPrevios) {
      const [ejercicio, numero] = key.split('|');
      await pool.query('DELETE FROM cnt_asiento WHERE ejercicio = $1 AND numero = $2 AND empresa = $3', [ejercicio, Number(numero), empresa]);
    }
    for (const c of comprobantes) { c.asiento_numero = null; c.asiento_ejercicio = null; }
  }

  const candidatos = comprobantes.filter(c => !c.asiento_numero);
  if (!candidatos.length) {
    resultado.errores.push('Todos los comprobantes del período ya están contabilizados');
    return resultado;
  }

  const grupos = new Map(); // "modulo:modelo" -> comprobantes[]
  for (const c of candidatos) {
    if (!GRUPO_POR_MODULO[c.modulo]) continue; // módulo fuera de alcance (no debería pasar, iva_comprobante.modulo es COMPRA/VENTA)
    if (!c.modelo) {
      resultado.comprobantesOmitidos.push({ comprobante: c.comprobante, tipo: c.tipo, modulo: c.modulo, motivo: 'El tipo de comprobante no tiene un modelo de asiento configurado' });
      continue;
    }
    const key = `${c.modulo}:${c.modelo}`;
    if (!grupos.has(key)) grupos.set(key, { modulo: c.modulo, modeloId: c.modelo, lista: [] });
    grupos.get(key).lista.push(c);
  }

  for (const { modulo, modeloId, lista } of grupos.values()) {
    try {
      const asiento = await generarAsientoModelo({
        modeloId, empresa, grupoEsperado: GRUPO_POR_MODULO[modulo], periodoRow, comprobantes: lista,
      });
      resultado.asientosGenerados.push({ modulo, ...asiento });
      resultado.comprobantesProcesados += lista.length;
    } catch (err) {
      resultado.errores.push(`${modulo} / modelo ${modeloId}: ${err.message}`);
    }
  }

  return resultado;
}

module.exports = { contabilizarPeriodo };
