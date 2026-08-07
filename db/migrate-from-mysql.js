#!/usr/bin/env node
// Convierte dumps MySQL 5.5 a INSERTs compatibles con PostgreSQL 16.
//
// Uso:  node migrate-from-mysql.js --all
//        node migrate-from-mysql.js <archivo.sql> [salida.sql]

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Mapa de tipos por columna (posición 1-indexed) para tablas con BOOLEAN o BYTEA.
// Solo las tablas donde importa (las demás son todo TEXT/NUMBER → se dejan igual).
// 'B' = BOOLEAN (0→FALSE, 1→TRUE), 'X' = BYTEA (→ NULL)
// ---------------------------------------------------------------------------
const COL_TYPES = {
  sys_empresa:        { 11:'X', 20:'X', 29:'B', 30:'B', 33:'B' },
  bas_importacion:    { 8:'B', 9:'B' },
  bas_proyecto:       { 16:'B', 17:'B' },   // visible, (id_padre is VARCHAR, safe)
  sld_concepto:       { 7:'B', 10:'B', 12:'B', 14:'B', 20:'B' },
  sld_concepto_lsd:   // posiciones 2-21 son todas BOOLEAN (aporte_*/contribucion_*, repetible)
    Object.fromEntries(Array.from({length:20}, (_,i) => [i+2,'B'])),
  sld_empleado:       { 24:'X', 35:'B' },
  sld_recibo:         { 18:'B', 19:'B' },
  sld_recibo_concepto:{ 11:'B', 12:'B', 13:'B' },
  sld_informe:        { 6:'B' },
  sld_informe_campo:  { 4:'B', 5:'B' },
};

// ---------------------------------------------------------------------------
// Para columnas NOT NULL sin DEFAULT que vienen NULL del dump MySQL
// ---------------------------------------------------------------------------
const NOT_NULL_DEFAULTS = {
  sld_concepto_de_grupo:  { liquidacion: "'MENSUAL'", recibo: '0' },
  sld_empleado_concepto:  { liquidacion: "'MENSUAL'", recibo: '0' },
  sld_concepto_general:   { liquidacion: "'MENSUAL'", recibo: '0' },
};

// ---------------------------------------------------------------------------
// VARCHAR limits a truncar (cols que tienen datos más largos que el schema)
// ---------------------------------------------------------------------------
const VARCHAR_LIMITS = {
  sld_actividad_laboral: { descripcion: 255 },
  sld_liquidacion: { lugar_pago: 100, periodo_deposito: 40, banco_deposito: 60 },
};

// ---------------------------------------------------------------------------
// Tablas que existen en nuestro schema PostgreSQL
// ---------------------------------------------------------------------------
const TARGET_TABLES = new Set([
  'sys_empresa','sys_group','sys_user','sys_user_group','sys_dynamic_field',
  'bas_moneda','bas_provincia','bas_localidad','bas_proyecto','bas_importacion',
  'sld_actividad_laboral','sld_campo_historial','sld_codigo_zona',
  'sld_condicion_laboral','sld_feriado','sld_formula_auxiliar',
  'sld_grupo','sld_grupo_de_conceptos','sld_incapacidad','sld_modalidad_contrato',
  'sld_motivo_ausentismo','sld_obra_social','sld_sindicato','sld_situacion_revista',
  'sld_tabla','sld_tipo_novedad',
  'sld_concepto','sld_concepto_lsd','sld_concepto_general','sld_concepto_grupo',
  'sld_convenio','sld_categoria','sld_categoria_periodo',
  'sld_liquidacion',
  'sld_empleado','sld_empleado_afip','sld_empleado_concepto',
  'sld_empleado_field','sld_familiar','sld_jornada_laboral','sld_horario',
  'sld_ausentismo','sld_presentismo','sld_novedad','sld_historial_empleado',
  'sld_concepto_de_grupo',
  'sld_recibo','sld_recibo_concepto','sld_recibo_empleado','sld_recibo_afip',
  'sld_historial','sld_fila',
  'sld_importacion','sld_importacion_novedad',
  'sld_informe','sld_informe_campo',
]);

// ---------------------------------------------------------------------------
// Extrae los nombres de columna de un bloque CREATE TABLE MySQL.
// Ignora líneas que son KEY, CONSTRAINT, INDEX o PRIMARY KEY.
// ---------------------------------------------------------------------------
function extractMysqlColumns(createTableBlock) {
  return createTableBlock
    .split('\n')
    .filter(l => {
      const t = l.trim();
      return t.startsWith('`') || (t.startsWith('\'') && !t.match(/^\s*(KEY|PRIMARY|UNIQUE|CONSTRAINT|INDEX)/i));
    })
    .filter(l => !l.trim().match(/^\s*(KEY|PRIMARY|UNIQUE|CONSTRAINT|INDEX)/i))
    .map(l => {
      const m = l.trim().match(/^`(\w+)`/);
      return m ? m[1] : null;
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Parser de VALUES para MySQL.
// Devuelve array de tokens: cada token es una string cruda del valor SQL.
// Maneja: strings con \' y '', NULL, números.
// Binario (bytes < 0x20 no-blancos): marca el valor como BINARY.
// ---------------------------------------------------------------------------
function parseValueTokens(str) {
  const tokens = [];
  let i = 0;

  while (i < str.length) {
    // saltar comas y espacios entre valores
    while (i < str.length && (str[i] === ',' || str[i] === ' ')) i++;
    if (i >= str.length || str[i] === ')') break;

    if (str[i] === "'") {
      // string literal — escanear hasta cierre de quote
      let out = "'";
      let hasBinary = false;
      i++;
      while (i < str.length) {
        const ch = str[i];
        const code = str.charCodeAt(i);
        if (ch === '\\') {
          if (str[i+1] === "'") { out += "''"; i += 2; }  // \' → ''
          else if (str[i+1] === '0') { i += 2; }           // \0 → strip (MySQL null byte escape)
          else                  { out += ch; i++; }
        } else if (ch === "'" && str[i+1] === "'") {
          out += "''"; i += 2;
        } else if (ch === "'") {
          out += "'"; i++; break;
        } else {
          if (code === 0x00) { i++; continue; }  // strip literal null bytes
          if (code < 0x20 && ch !== '\t' && ch !== '\n' && ch !== '\r') hasBinary = true;
          out += ch; i++;
        }
      }
      tokens.push(hasBinary ? '__BINARY__' : out);
    } else if (str.slice(i, i+4).toUpperCase() === 'NULL') {
      tokens.push('NULL'); i += 4;
    } else {
      // número u otro literal (sin comillas)
      let num = '';
      while (i < str.length && str[i] !== ',' && str[i] !== ')') {
        num += str[i]; i++;
      }
      tokens.push(num.trim());
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Convierte un array de tokens según los tipos de columna de la tabla.
// colNames: array de nombres de columna en el orden del MySQL dump (puede ser undefined).
// ---------------------------------------------------------------------------
function convertTokens(tableName, tokens, colNames) {
  const types    = COL_TYPES[tableName] || {};
  const defaults = NOT_NULL_DEFAULTS[tableName] || {};
  const limits   = VARCHAR_LIMITS[tableName] || {};

  return tokens.map((tok, idx) => {
    const col     = idx + 1;           // 1-indexed (para COL_TYPES que usa posiciones fijas)
    const colName = colNames ? colNames[idx] : null;
    const type    = types[col];

    if (type === 'X') return 'NULL';   // BYTEA → NULL

    if (type === 'B') {                // BOOLEAN
      if (tok === '0' || tok === "''") return 'FALSE';
      if (tok === '1')                 return 'TRUE';
      if (tok === 'NULL' || tok === '__BINARY__') return 'NULL';
      return tok;
    }

    if (tok === '__BINARY__') return 'NULL';

    // NOT NULL defaults (cuando el dump tiene NULL pero el schema no lo permite)
    if (tok === 'NULL' && colName && defaults[colName] !== undefined) {
      return defaults[colName];
    }

    // Truncar strings que exceden el límite VARCHAR
    if (colName && limits[colName] && tok.startsWith("'")) {
      const maxLen = limits[colName];
      const inner  = tok.slice(1, -1);  // quitar quotes externas
      if (inner.length > maxLen) {
        return "'" + inner.substring(0, maxLen) + "'";
      }
    }

    return tok;
  });
}

// ---------------------------------------------------------------------------
// Transforma una línea de INSERT completa.
// colNames: nombres de columna en orden MySQL (para INSERT con columnas explícitas).
// ---------------------------------------------------------------------------
function transformInsert(line, tableName, empresaId, srcId, colNames) {
  line = line.replace(/`/g, '');
  line = line.replace(/'0000-00-00 00:00:00'/g, 'NULL');
  line = line.replace(/'0000-00-00'/g, 'NULL');

  if (srcId && srcId !== empresaId) {
    line = line.split(`'${srcId}'`).join(`'${empresaId}'`);
  }

  const needsConversion = COL_TYPES[tableName] || NOT_NULL_DEFAULTS[tableName] || VARCHAR_LIMITS[tableName];
  const needsColNames   = colNames && colNames.length > 0;

  if (needsConversion || needsColNames) {
    const valuesIdx = line.indexOf(' VALUES ');
    if (valuesIdx !== -1) {
      // Si tenemos nombres de columna MySQL, usarlos en el INSERT
      const colList = needsColNames ? `(${colNames.join(',')}) ` : '';
      const prefix  = `INSERT INTO ${tableName} ${colList}VALUES `;
      let rest      = line.slice(valuesIdx + 8);

      const tuples = [];
      let i = 0;
      while (i < rest.length) {
        while (i < rest.length && rest[i] !== '(') i++;
        if (i >= rest.length) break;
        i++;

        let depth = 1, tContent = '';
        while (i < rest.length && depth > 0) {
          if (rest[i] === '(') depth++;
          else if (rest[i] === ')') { depth--; if (depth === 0) break; }
          tContent += rest[i]; i++;
        }
        i++;

        const tokens    = parseValueTokens(tContent);
        const converted = convertTokens(tableName, tokens, colNames);
        tuples.push(`(${converted.join(',')})`);
      }

      return `${prefix}${tuples.join(',')} ON CONFLICT DO NOTHING;`;
    }
  }

  return line.replace(/;$/, ' ON CONFLICT DO NOTHING;');
}

// ---------------------------------------------------------------------------
// Detecta el ID de empresa raíz (primera fila de sys_empresa).
// ---------------------------------------------------------------------------
function detectEmpresaId(content) {
  const insertLine = content.split('\n').find(l => l.startsWith('INSERT INTO `sys_empresa`'));
  if (!insertLine) return null;
  const m = insertLine.match(/VALUES \('([^']+)'/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// ID canónico desde nombre de archivo (sin fecha, lowercase, guiones bajos).
// ---------------------------------------------------------------------------
function canonicalId(filename) {
  return path.basename(filename)
    .replace(/_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql$/i, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
    .substring(0, 30);
}

// ---------------------------------------------------------------------------
// Procesa un dump completo y devuelve el SQL para PostgreSQL.
// ---------------------------------------------------------------------------
function processDump(inputFile) {
  const content   = fs.readFileSync(inputFile, 'utf8');
  const srcId     = detectEmpresaId(content);
  const empresaId = canonicalId(inputFile);
  const needsRename = srcId && srcId !== empresaId;

  console.error(`  ID original: ${srcId ?? '(no encontrado)'} → ID canónico: ${empresaId}`);

  const outputLines = [
    `-- Generado por migrate-from-mysql.js`,
    `-- Origen: ${path.basename(inputFile)}`,
    `-- Empresa ID: ${empresaId}`,
    needsRename ? `-- (renombrado desde '${srcId}')` : '',
    '',
    'BEGIN;',
    'SET session_replication_role = replica;',
    'SET standard_conforming_strings = off;',  // interpreta \' igual que MySQL
    '',
  ].filter(l => l !== null);

  // --- Paso 1: extraer columnas de cada CREATE TABLE del dump ---
  const mysqlColumns = {};
  {
    const createRe = /CREATE TABLE `(\w+)` \(([\s\S]*?)\) ENGINE=/g;
    let cm;
    while ((cm = createRe.exec(content)) !== null) {
      const tname = cm[1];
      if (TARGET_TABLES.has(tname)) {
        mysqlColumns[tname] = extractMysqlColumns(cm[2]);
      }
    }
  }

  let included = 0;
  let skipped  = 0;
  let pending  = '';        // acumula líneas de un INSERT multi-línea

  const processStatement = (stmt) => {
    stmt = stmt.trim();
    if (!stmt.startsWith('INSERT INTO')) return;

    const m = stmt.match(/^INSERT INTO `?(\w+)`?/);
    if (!m) return;

    const tableName = m[1];
    if (!TARGET_TABLES.has(tableName)) { skipped++; return; }

    included++;
    const colNames = mysqlColumns[tableName] || [];
    outputLines.push(transformInsert(stmt, tableName, empresaId, srcId, colNames));
  };

  for (const raw of content.split('\n')) {
    const line = raw.trimEnd();

    if (!line || line.startsWith('--')) continue;
    if (line.startsWith('/*!'))          continue;
    if (/^(LOCK|UNLOCK) TABLES/i.test(line)) continue;
    if (/^(DROP|CREATE) TABLE/i.test(line))  continue;
    if (/^(SET|ALTER|KEY|CONSTRAINT)/i.test(line)) continue;

    if (line.startsWith('INSERT INTO')) {
      if (pending) processStatement(pending);  // flush anterior
      pending = line;
    } else if (pending) {
      pending += '\n' + line;  // continúa INSERT multi-línea
    }

    // Si la línea termina el statement (;), procesar
    if (pending && line.trimEnd().endsWith(';')) {
      processStatement(pending);
      pending = '';
    }
  }
  if (pending) processStatement(pending);  // último statement sin ; final

  outputLines.push('');
  outputLines.push(`UPDATE sld_empleado SET empresa = '${empresaId}' WHERE empresa IS NULL OR empresa = '';`);
  outputLines.push('');
  outputLines.push('SET session_replication_role = DEFAULT;');
  outputLines.push('COMMIT;');
  outputLines.push('');

  console.error(`  INSERTs incluidos: ${included} | omitidos: ${skipped}`);
  // Strip \0 escape sequences que sobreviven en tablas sin conversión especial.
  // Con standard_conforming_strings=off, PostgreSQL interpreta \0 como byte nulo.
  return outputLines.join('\n').replace(/\\0/g, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const BACKUP_DIR = path.join(__dirname, 'mysql', 'data');
const DATA_DIR   = path.join(__dirname, 'postgresql', 'data');

if (process.argv[2] === '--all') {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const dumps = fs.readdirSync(BACKUP_DIR)
    .filter(f => /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql$/.test(f));

  console.error(`Procesando ${dumps.length} dumps...\n`);

  for (const dump of dumps) {
    const inputFile  = path.join(BACKUP_DIR, dump);
    const outName    = `${canonicalId(inputFile)}_pg.sql`;
    const outputFile = path.join(DATA_DIR, outName);

    console.error(`[${dump}]`);
    const sql = processDump(inputFile);
    fs.writeFileSync(outputFile, sql, 'utf8');
    console.error(`  → ${outName}\n`);
  }
  console.error('Listo. Archivos en db/postgres/data/');

} else {
  const inputFile  = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile) {
    console.error('Uso: node migrate-from-mysql.js <archivo.sql> [salida.sql]');
    console.error('      node migrate-from-mysql.js --all');
    process.exit(1);
  }

  console.error(`[${path.basename(inputFile)}]`);
  const sql = processDump(inputFile);

  if (outputFile) {
    fs.writeFileSync(outputFile, sql, 'utf8');
    console.error(`Escrito: ${outputFile}`);
  } else {
    process.stdout.write(sql);
  }
}
