#!/usr/bin/env node
// Migra los datos legacy de Contabilidad (cnt_cuenta, cnt_centro_de_costo,
// cnt_prorrateo, cnt_leyenda, cnt_ejercicio) desde los dumps MySQL a Postgres.
//
// A diferencia de migrate-from-mysql.js, acá las 6 empresas ya existen en
// sys_empresa con ids fijos (asignados en la migración de Sueldos) — no hay
// que resolver ids de empresa ni de empleado, solo mapear archivo → id
// existente (ver `docker exec sueldos_db psql ... SELECT id, razon_social
// FROM sys_empresa`) y agregar la columna `empresa` a cada fila, igual que
// TABLES_NEEDING_EMPRESA_COLUMN en migrate-from-mysql.js.
//
// Uso: node migrate-contabilidad.js [salida.sql]

const fs   = require('fs');
const path = require('path');
const { parseValueTokens, splitTuples, extractMysqlColumns } = require('./migrate-from-mysql');

const DUMP_DIR = path.join(__dirname, 'mysql', 'data', '2026-09-02');

// id de sys_empresa ya asignado a cada dump (confirmado contra la DB viva).
const DUMPS = [
  { file: 'icp sa_2026-09-02_15-45.sql',              empresa: 1 },
  { file: 'master_2026-09-02_15-45.sql',               empresa: 2 },
  { file: 'minucc luis_2026-09-02_15-45.sql',           empresa: 3 },
  { file: 'minucci pablo_2026-09-02_15-45.sql',         empresa: 4 },
  { file: 'thompson y french sa_2026-09-02_15-45.sql',  empresa: 5 },
  { file: 'zurawski jorge hecto_2026-09-02_15-45.sql',  empresa: 6 },
];

const TABLES = ['cnt_cuenta', 'cnt_centro_de_costo', 'cnt_prorrateo', 'cnt_leyenda', 'cnt_ejercicio'];

// Columnas tinyint(1) del legacy que son BOOLEAN en Postgres (el resto de las
// columnas de estas 5 tablas son texto/numéricas/fecha y viajan tal cual).
const BOOL_COLS = {
  cnt_cuenta:    ['imputable', 'monetaria'],
  cnt_ejercicio: ['leyenda_asiento', 'leyenda_cuenta'],
};

function extractTable(content, tableName) {
  const createRe = new RegExp('CREATE TABLE `' + tableName + '` \\(([\\s\\S]*?)\\) ENGINE=');
  const cm = createRe.exec(content);
  if (!cm) return null;
  const colNames = extractMysqlColumns(cm[1]);

  const insertRe = new RegExp('^INSERT INTO `' + tableName + '` VALUES (.*);$', 'm');
  const im = insertRe.exec(content);
  if (!im) return { colNames, rows: [] };

  const rows = splitTuples(im[1]).map(t => parseValueTokens(t).tokens);
  return { colNames, rows };
}

function boolToken(tok) {
  if (tok === '0') return 'FALSE';
  if (tok === '1') return 'TRUE';
  return tok; // NULL
}

const outputLines = [
  '-- Generado por migrate-contabilidad.js',
  '-- Migra cnt_cuenta/cnt_centro_de_costo/cnt_prorrateo/cnt_leyenda/cnt_ejercicio',
  '-- desde db/mysql/data/2026-09-02/ hacia las 6 empresas ya existentes en sys_empresa.',
  '',
  'BEGIN;',
  // Igual que migrate-from-mysql.js: cnt_cuenta tiene filas con id_padre
  // auto-referenciado (o referenciando una fila que llega después en el mismo
  // INSERT) — desactiva los triggers de FK mientras se cargan todas las filas.
  'SET session_replication_role = replica;',
  '',
];

for (const { file, empresa } of DUMPS) {
  const inputFile = path.join(DUMP_DIR, file);
  const content = fs.readFileSync(inputFile, 'latin1');
  outputLines.push(`-- ${file} -> sys_empresa.id = ${empresa}`);

  for (const tableName of TABLES) {
    const extracted = extractTable(content, tableName);
    if (!extracted || extracted.rows.length === 0) continue;
    const { colNames, rows } = extracted;
    const boolCols = BOOL_COLS[tableName] || [];
    const boolIdx = boolCols.map(c => colNames.indexOf(c));

    const outCols = [...colNames, 'empresa'];
    const tuples = rows.map(tokens => {
      const converted = tokens.map((tok, i) => (boolIdx.includes(i) ? boolToken(tok) : tok));
      converted.push(String(empresa));
      return `(${converted.join(',')})`;
    });

    outputLines.push(
      `INSERT INTO ${tableName} (${outCols.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING;`
    );
    console.error(`  ${file} / ${tableName}: ${rows.length} filas`);
  }
  outputLines.push('');
}

outputLines.push('SET session_replication_role = DEFAULT;', 'COMMIT;', '');

const outputFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'postgresql', 'data', 'contabilidad_pg.sql');
fs.writeFileSync(outputFile, outputLines.join('\n'), 'latin1');
console.error(`\n-> ${outputFile}`);
