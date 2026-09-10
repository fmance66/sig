#!/usr/bin/env node
// Migra los asientos y movimientos reales (partida doble) desde los dumps MySQL
// hacia cnt_asiento/cnt_movimiento (schema nuevo de sig-75, migraciones 006/007).
//
// Solo ICP SA y Thompson y French SA tienen asientos cargados en el legacy — las
// otras 4 empresas tienen el plan de cuentas configurado pero cero asientos (ver
// [[project_modulo_contabilidad_base]]).
//
// Mapeo de columnas: el legacy separa `id` (interno, PK) de `numero` (orden de
// visualización, reordenable) en cnt_asiento; el schema nuevo unificó ambos en
// una sola columna `numero` (autoasignada MAX+1). Se migra usando el `id` legacy
// como `numero` nuevo -- preserva el link con cnt_movimiento.asiento (que
// referencia `id`, no `numero`) sin necesitar una tabla de resolución, y es
// semánticamente más parecido (ambos son el identificador interno estable). El
// `numero` de exhibición legacy (que en 63/118 de ICP y 943/1027 de Thompson no
// coincide con el id) NO se migra -- no hay columna para eso en el schema nuevo.
// Si se quiere reproducir un orden específico, usar la pantalla de Renumeración
// ya construida (PUT /api/contabilidad/asientos/renumerar) después de esta carga.
//
// Verificado en los dumps de origen (ver conversación): tipo/proyecto/empresa(legacy)
// /ejercicio_union/asiento_union siempre NULL, moneda NULL o 'PES' (existe en
// bas_moneda), visible siempre TRUE, cero asientos con id_padre huérfano de
// ejercicio -- no hace falta resolver nada más que el id numérico de empresa.

const fs   = require('fs');
const path = require('path');
const { parseValueTokens, splitTuples } = require('./migrate-from-mysql');

const DUMP_DIR = path.join(__dirname, 'mysql', 'data', '2026-09-02');

const DUMPS = [
  { file: 'icp sa_2026-09-02_15-45.sql',             empresa: 1 },
  { file: 'thompson y french sa_2026-09-02_15-45.sql', empresa: 5 },
];

function extractRows(content, tableName) {
  const insertRe = new RegExp('^INSERT INTO `' + tableName + '` VALUES (.*);$', 'm');
  const im = insertRe.exec(content);
  if (!im) return [];
  return splitTuples(im[1]).map(t => parseValueTokens(t).tokens);
}

const outputLines = [
  '-- Generado por migrate-contabilidad-asientos.js',
  '-- Migra cnt_asiento/cnt_movimiento (datos reales) de ICP SA y Thompson y French SA.',
  '',
  'BEGIN;',
  'SET session_replication_role = replica;',
  '',
];

for (const { file, empresa } of DUMPS) {
  const content = fs.readFileSync(path.join(DUMP_DIR, file), 'latin1');
  outputLines.push(`-- ${file} -> sys_empresa.id = ${empresa}`);

  // cnt_asiento: ejercicio,id,numero,fecha,imputacion,leyenda,saldo_debe,saldo_haber,
  //              tipo,moneda,cotizacion,proyecto,empresa(legacy),ejercicio_union,
  //              asiento_union,union_asiento,visible
  const asientos = extractRows(content, 'cnt_asiento');
  if (asientos.length) {
    const cols = ['ejercicio', 'numero', 'empresa', 'fecha', 'leyenda', 'tipo', 'moneda', 'cotizacion', 'proyecto', 'ejercicio_union', 'asiento_union'];
    const tuples = asientos.map(r => {
      const [ejercicio, id, , fecha, , leyenda, , , tipo, moneda, cotizacion, proyecto, , ejercicioUnion, asientoUnion] = r;
      return `(${[ejercicio, id, String(empresa), fecha, leyenda, tipo, moneda, cotizacion, proyecto, ejercicioUnion, asientoUnion].join(',')})`;
    });
    outputLines.push(`INSERT INTO cnt_asiento (${cols.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING;`);
    console.error(`  ${file} / cnt_asiento: ${asientos.length} filas`);
  }

  // cnt_movimiento: ejercicio,asiento,numero(linea),cuenta,debe,haber,leyenda,proyecto
  const movimientos = extractRows(content, 'cnt_movimiento');
  if (movimientos.length) {
    const cols = ['ejercicio', 'numero', 'linea', 'empresa', 'cuenta', 'debe', 'haber', 'leyenda', 'proyecto'];
    const tuples = movimientos.map(r => {
      const [ejercicio, asiento, linea, cuenta, debe, haber, leyenda, proyecto] = r;
      return `(${[ejercicio, asiento, linea, String(empresa), cuenta, debe, haber, leyenda, proyecto].join(',')})`;
    });
    outputLines.push(`INSERT INTO cnt_movimiento (${cols.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING;`);
    console.error(`  ${file} / cnt_movimiento: ${movimientos.length} filas`);
  }
  outputLines.push('');
}

outputLines.push('SET session_replication_role = DEFAULT;', 'COMMIT;', '');

const outputFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'postgresql', 'data', 'contabilidad_asientos_pg.sql');
fs.writeFileSync(outputFile, outputLines.join('\n'), 'latin1');
console.error(`\n-> ${outputFile}`);
