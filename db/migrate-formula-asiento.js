#!/usr/bin/env node
// Migra los datos reales de Fórmulas de Asiento (cnt_modelo_asiento legacy)
// desde el dump MySQL de Master hacia cnt_modelo_asiento/cnt_formula_movimiento
// en Postgres. Ver comentario de 010_contabilidad_formula_asiento.sql para el
// porqué de la trampa de nombres y del alcance.
//
// Solo Master tiene datos reales (8 modelos/33 líneas en el dump). De esas 8,
// se migran 4: ASIENTO_COMPRA, ASIENTO_VENTA, COBRO_ASIENTO, PAGO_ASIENTO —
// las únicas efectivamente referenciadas desde iva_tipo_comprobante
// (modelo_asiento_cmp/modelo_asiento_vta). COMPRA_ASIENTO/VENTA_ASIENTO son
// duplicados exactos sin ninguna referencia real; SUELDOS/DEPOSITO son de
// otros módulos (Liquidaciones/Tesorería, no IVA). Minucci Luis, Minucci
// Pablo y Zurawski solo tienen una plantilla vacía sin líneas; ICP y Thompson
// no tienen ninguna fila — no hay nada real que migrar de esas 5 empresas.
//
// Reusa el parser quote-aware de migrate-from-mysql.js (splitTuples/
// parseValueTokens) para no reimplementar el split de tuplas con comas
// dentro de fórmulas (ej. "IF(RUBRO=?,NETO_TOTAL+...,0)"). A diferencia de
// ese script, acá se corrige a mano un detalle que no le importa a
// migrate-from-mysql.js (nunca lo pisó): un `\"` dentro de un string
// MySQL de comilla simple queda tal cual (con la barra) en el token de
// salida — Postgres no lo necesita escapado, así que se limpia acá.
//
// Uso: node migrate-formula-asiento.js [salida.sql]

const fs   = require('fs');
const path = require('path');
const { parseValueTokens, splitTuples } = require('./migrate-from-mysql');

const DUMP_FILE = path.join(__dirname, 'mysql', 'data', '2026-09-02', 'master_2026-09-02_15-45.sql');
const EMPRESA = 2; // Master

const MODELOS_A_MIGRAR = new Set(['ASIENTO_COMPRA', 'ASIENTO_VENTA', 'COBRO_ASIENTO', 'PAGO_ASIENTO']);

// Columnas del legacy `cnt_modelo_asiento`, en orden. `imputacion` (índice 4)
// no se migra: 0 filas no-NULL en los 6 dumps, no tiene tabla nueva.
const MODELO_ASIENTO_COLS = [
  'id', 'descripcion', 'grupo', 'fecha', 'imputacion', 'leyenda', 'condicion',
  'asiento_negativo', 'pesificar', 'unir_asientos', 'combinar_cuentas',
  'dividir_rubro', 'dividir_proyecto', 'dividir_imputable', 'orden',
];
const MODELO_ASIENTO_BOOL_COLS = ['pesificar', 'unir_asientos', 'combinar_cuentas', 'dividir_rubro', 'dividir_proyecto', 'dividir_imputable'];

const MODELO_MOVIMIENTO_COLS = ['modelo', 'movimiento', 'cuenta', 'saldo', 'formula', 'leyenda'];

function boolToken(tok) {
  if (tok === '0') return 'FALSE';
  if (tok === '1') return 'TRUE';
  return tok; // NULL
}

// Un `\"` dentro de un string de comilla simple de MySQL llega al token de
// salida de parseValueTokens tal cual (con la barra invertida) — Postgres no
// escapa comillas dobles dentro de un string de comilla simple, así que sobra.
function fixEscapedDoubleQuotes(tok) {
  return tok.startsWith("'") ? tok.replace(/\\"/g, '"') : tok;
}

function extractTable(content, tableName) {
  const insertRe = new RegExp('^INSERT INTO `' + tableName + '` VALUES (.*);$', 'm');
  const im = insertRe.exec(content);
  if (!im) return [];
  return splitTuples(im[1]).map(t => parseValueTokens(t).tokens.map(fixEscapedDoubleQuotes));
}

const content = fs.readFileSync(DUMP_FILE, 'latin1');

const modeloRows = extractTable(content, 'cnt_modelo_asiento')
  .filter(tokens => MODELOS_A_MIGRAR.has(tokens[0].replace(/^'|'$/g, '')));
const movimientoRowsAll = extractTable(content, 'cnt_modelo_movimiento')
  .filter(tokens => MODELOS_A_MIGRAR.has(tokens[0].replace(/^'|'$/g, '')));

if (modeloRows.length !== MODELOS_A_MIGRAR.size) {
  throw new Error(`Se esperaban ${MODELOS_A_MIGRAR.size} modelos, se encontraron ${modeloRows.length}`);
}

const outputLines = [
  '-- Generado por migrate-formula-asiento.js',
  '-- Migra cnt_modelo_asiento/cnt_formula_movimiento (datos reales de Master, empresa=2)',
  '',
  'BEGIN;',
  '',
];

// cnt_modelo_asiento: dropear columna imputacion (índice 4), convertir booleanos, agregar empresa.
const boolIdx = MODELO_ASIENTO_BOOL_COLS.map(c => MODELO_ASIENTO_COLS.indexOf(c));
const outCols = MODELO_ASIENTO_COLS.filter(c => c !== 'imputacion').concat('empresa');
const modeloTuples = modeloRows.map(tokens => {
  const converted = tokens
    .map((tok, i) => (boolIdx.includes(i) ? boolToken(tok) : tok))
    .filter((_, i) => i !== 4);
  converted.push(String(EMPRESA));
  return `(${converted.join(',')})`;
});
outputLines.push(
  `INSERT INTO cnt_modelo_asiento (${outCols.join(',')}) VALUES`,
  '  ' + modeloTuples.join(',\n  ') + ' ON CONFLICT DO NOTHING;',
  ''
);
console.error(`cnt_modelo_asiento: ${modeloRows.length} filas`);

// cnt_formula_movimiento: mismo orden de columnas que el legacy + empresa.
const movOutCols = MODELO_MOVIMIENTO_COLS.concat('empresa');
const movTuples = movimientoRowsAll.map(tokens => {
  const converted = [...tokens, String(EMPRESA)];
  return `(${converted.join(',')})`;
});
outputLines.push(
  `INSERT INTO cnt_formula_movimiento (${movOutCols.join(',')}) VALUES`,
  '  ' + movTuples.join(',\n  ') + ' ON CONFLICT DO NOTHING;',
  ''
);
console.error(`cnt_formula_movimiento: ${movimientoRowsAll.length} filas`);

outputLines.push('COMMIT;', '');

const outputFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'postgresql', 'data', 'contabilidad_formula_asiento_pg.sql');
fs.writeFileSync(outputFile, outputLines.join('\n'), 'latin1');
console.error(`\n-> ${outputFile}`);
