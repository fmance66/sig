#!/usr/bin/env node
// Migra cnt_coeficiente (índices de inflación) desde el dump MySQL "master" a
// Postgres. A diferencia de migrate-contabilidad.js, esta tabla es GLOBAL (sin
// columna `empresa`: el legacy la tiene una sola vez en la base master, no una
// copia por empresa) así que se lee de un único archivo, sin loop de empresas.
//
// Uso: node migrate-contabilidad-coeficientes.js [salida.sql]

const fs   = require('fs');
const path = require('path');
const { parseValueTokens, splitTuples, extractMysqlColumns } = require('./migrate-from-mysql');

const INPUT_FILE = path.join(__dirname, 'mysql', 'data', '2026-09-02', 'master_2026-09-02_15-45.sql');

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

const content = fs.readFileSync(INPUT_FILE, 'latin1');
const extracted = extractTable(content, 'cnt_coeficiente');
if (!extracted || extracted.rows.length === 0) {
  console.error('No se encontraron filas de cnt_coeficiente en el dump.');
  process.exit(1);
}

const { colNames, rows } = extracted;
const tuples = rows.map(tokens => `(${tokens.join(',')})`);

const outputLines = [
  '-- Generado por migrate-contabilidad-coeficientes.js',
  '-- Serie histórica de índices de inflación (IPIM), tabla global sin empresa.',
  '',
  'BEGIN;',
  `INSERT INTO cnt_coeficiente (${colNames.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING;`,
  'COMMIT;',
  '',
];

console.error(`  cnt_coeficiente: ${rows.length} filas`);

const outputFile = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, 'postgresql', 'data', 'contabilidad_coeficientes_pg.sql');
fs.writeFileSync(outputFile, outputLines.join('\n'), 'latin1');
console.error(`\n-> ${outputFile}`);
