#!/usr/bin/env node
// Migra los datos legacy de I.V.A. (fase 1: tablas comunes, Compras, Ventas,
// Períodos) desde los dumps MySQL a Postgres.
//
// Mismo criterio que migrate-contabilidad.js: las 6 empresas ya existen en
// sys_empresa con ids fijos, solo hay que mapear archivo -> id y agregar la
// columna `empresa` (tenant) a cada fila.
//
// Dos tablas son catálogos GLOBALES (bas_condicion_iva, iva_tipo_afip): salen
// idénticas en las 6 empresas del dump (listas fijas de AFIP), así que se
// cargan sin columna `empresa` y el `ON CONFLICT DO NOTHING` por PK descarta
// los duplicados de las empresas 2-6 automáticamente.
//
// iva_comprobante.empresa del legacy es una columna de negocio (lotes/
// consolidación), no el tenant: se renombra a empresa_relacionada al volcar.
//
// Uso: node migrate-iva.js [salida.sql]

const fs   = require('fs');
const path = require('path');
const { parseValueTokens, splitTuples, extractMysqlColumns } = require('./migrate-from-mysql');

const DUMP_DIR = path.join(__dirname, 'mysql', 'data', '2026-09-02');

const DUMPS = [
  { file: 'icp sa_2026-09-02_15-45.sql',              empresa: 1 },
  { file: 'master_2026-09-02_15-45.sql',               empresa: 2 },
  { file: 'minucc luis_2026-09-02_15-45.sql',           empresa: 3 },
  { file: 'minucci pablo_2026-09-02_15-45.sql',         empresa: 4 },
  { file: 'thompson y french sa_2026-09-02_15-45.sql',  empresa: 5 },
  { file: 'zurawski jorge hecto_2026-09-02_15-45.sql',  empresa: 6 },
];

// Catálogos globales: idénticos en las 6 empresas, sin columna `empresa`.
const GLOBAL_TABLES = ['bas_condicion_iva', 'iva_tipo_afip'];

// Tablas por-empresa, en un orden que no importa (FK triggers desactivados
// durante la carga, igual que migrate-contabilidad.js).
const TENANT_TABLES = [
  'bas_rubro',
  'iva_condicion_venta',
  'iva_modalidad',
  'iva_impuesto',
  'iva_tipo_comprobante',
  'iva_tipo_letra',
  'iva_modelo_comprobante',
  'iva_modelo_impuesto',
  'iva_tipo_modelo',
  'iva_punto_de_venta',
  'iva_persona',
  'iva_item',
  'iva_liquidacion',
  'iva_comprobante',
  'iva_comprobante_item',
  'iva_comprobante_impuesto',
];

// Columnas tinyint(1) del legacy que son BOOLEAN en Postgres.
const BOOL_COLS = {
  iva_impuesto:            ['ddjj_iva'],
  iva_tipo_comprobante:    ['save_tipo', 'save_punto', 'campo_hasta'],
  iva_punto_de_venta:      ['rubro_auto', 'condicion_auto', 'activo'],
  iva_item:                ['ivainc', 'calcular'],
  iva_comprobante:         ['anulado'],
  iva_comprobante_item:    ['ivainc'],
};

// Tablas con id SERIAL en Postgres que no existe en el legacy (no se
// especifica columna id, Postgres la autogenera).
const SERIAL_ID_TABLES = new Set(['iva_modelo_impuesto', 'iva_comprobante_impuesto']);

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
  '-- Generado por migrate-iva.js',
  '-- Migra tablas comunes + Compras + Ventas + Períodos de I.V.A. (fase 1)',
  '-- desde db/mysql/data/2026-09-02/ hacia las 6 empresas ya existentes en sys_empresa.',
  '',
  'BEGIN;',
  'SET session_replication_role = replica;',
  '',
];

for (const { file, empresa } of DUMPS) {
  const inputFile = path.join(DUMP_DIR, file);
  const content = fs.readFileSync(inputFile, 'latin1');
  outputLines.push(`-- ${file} -> sys_empresa.id = ${empresa}`);

  for (const tableName of GLOBAL_TABLES) {
    const extracted = extractTable(content, tableName);
    if (!extracted || extracted.rows.length === 0) continue;
    const { colNames, rows } = extracted;
    const tuples = rows.map(tokens => `(${tokens.join(',')})`);
    outputLines.push(
      `INSERT INTO ${tableName} (${colNames.join(',')}) VALUES ${tuples.join(',')} ON CONFLICT DO NOTHING;`
    );
    console.error(`  ${file} / ${tableName} (global): ${rows.length} filas`);
  }

  for (const tableName of TENANT_TABLES) {
    const extracted = extractTable(content, tableName);
    if (!extracted || extracted.rows.length === 0) continue;
    const { colNames, rows } = extracted;
    const boolCols = BOOL_COLS[tableName] || [];
    const boolIdx = boolCols.map(c => colNames.indexOf(c));

    // iva_comprobante: el `empresa` legacy es una columna de negocio, no el
    // tenant -> se renombra a empresa_relacionada; el `empresa` de la PK se
    // agrega al final como en el resto de las tablas.
    const outColNames = tableName === 'iva_comprobante'
      ? colNames.map(c => (c === 'empresa' ? 'empresa_relacionada' : c))
      : colNames;

    // iva_modelo_impuesto / iva_comprobante_impuesto: `id` es SERIAL en Postgres
    // y no existe en el legacy -> se descarta esa columna del INSERT. Ninguna de
    // las dos tablas tiene columnas BOOL_COLS, así que no hay que recalcular
    // índices al filtrar.
    const idIdx = SERIAL_ID_TABLES.has(tableName) ? colNames.indexOf('id') : -1;

    const outCols = [...outColNames.filter((_, i) => i !== idIdx), 'empresa'];
    const tuples = rows.map(tokens => {
      const converted = tokens
        .map((tok, i) => (boolIdx.includes(i) ? boolToken(tok) : tok))
        .filter((_, i) => i !== idIdx);
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
  : path.join(__dirname, 'postgresql', 'data', 'iva_pg.sql');
fs.writeFileSync(outputFile, outputLines.join('\n'), 'latin1');
console.error(`\n-> ${outputFile}`);
