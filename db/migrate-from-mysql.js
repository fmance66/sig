#!/usr/bin/env node
// Convierte dumps MySQL 5.5 a INSERTs compatibles con PostgreSQL 16.
//
// Uso:  node migrate-from-mysql.js --all
//        node migrate-from-mysql.js <archivo.sql> [salida.sql]

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Resolutores de ids que pasaron de string (canónico del dump MySQL) a
// INTEGER autoincremental en Postgres: sys_empresa.id y sld_empleado.id
// (este último era el legajo, que ahora es un campo aparte — ver más abajo,
// sección "sld_empleado: legajo").
//
// `columns` declara qué columnas de qué tablas guardan uno de estos ids.
// `critical`:
//   - null            → TODAS esas columnas son PK/NOT NULL: si el id no se
//                        resuelve contra el mapa, la fila se descarta entera
//                        (insertar NULL ahí violaría la constraint).
//   - { tabla: [...] } → solo esas columnas son críticas; el resto son FKs
//                        nullable (ON DELETE SET NULL) y se guardan como NULL
//                        si el id no resuelve, sin descartar la fila.
// ---------------------------------------------------------------------------
const ID_RESOLVERS = {
  empresa: {
    columns: {
      sys_empresa: ['id', 'empresa'],   // 'empresa' es auto-referencia (grupo económico)
      sys_user:    ['empresa'],
      sld_empleado:['empresa'],
    },
    critical: { sys_empresa: ['id'] },
  },
  empleado: {
    columns: {
      sld_empleado:          ['id'],
      sld_empleado_afip:     ['empleado'],
      sld_empleado_concepto: ['empleado'],
      sld_empleado_field:    ['entity'],
      sld_familiar:          ['empleado'],
      sld_jornada_laboral:   ['empleado'],
      sld_horario:           ['empleado'],
      sld_ausentismo:        ['empleado'],
      sld_presentismo:       ['empleado'],
      sld_novedad:           ['empleado'],
      sld_historial_empleado:['empleado'],
      sld_recibo:            ['empleado'],
      sld_recibo_concepto:   ['empleado'],
      sld_recibo_empleado:   ['empleado'],
      sld_recibo_afip:       ['empleado'],
    },
    critical: null,   // las 15 son PK o componente de PK: todas críticas
  },
};

// ---------------------------------------------------------------------------
// Mapa de tipos por columna (posición 1-indexed) para tablas con BOOLEAN o BYTEA.
// Solo las tablas donde importa (las demás son todo TEXT/NUMBER → se dejan igual).
// 'B' = BOOLEAN (0→FALSE, 1→TRUE), 'X' = BYTEA (bytes reales del dump, ver bytesToBytea)
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
// Tablas per-empresa cuyo dump MySQL de origen (una base por empresa) nunca tuvo
// columna `empresa` porque no hacía falta — pero el schema Postgres compartido sí
// la requiere (NOT NULL, sin DEFAULT: ver 01_schema.sql). Se agrega acá al final
// de cada fila con el número de empresa ya resuelto para todo el archivo
// (empresaNum), igual para las 7 tablas porque cada dump es de una sola empresa.
// ---------------------------------------------------------------------------
const TABLES_NEEDING_EMPRESA_COLUMN = new Set([
  'sld_concepto', 'sld_concepto_lsd', 'sld_concepto_general', 'sld_concepto_grupo',
  'sld_concepto_de_grupo', 'sld_empleado_concepto', 'sld_recibo_concepto',
]);

// ---------------------------------------------------------------------------
// sld_concepto: si simbolo_unidad es alguna variante de "días", decimales_unidad
// tiene que ser 0 (una fórmula no da media jornada) — el dump de origen trae
// NULL en la mayoría de esos casos (confirmado: es así en el MySQL original,
// no un bug de la migración), así que se fuerza acá para no arrastrar el hueco
// a cada migración futura. Ver db/MIGRACION_BITACORA.md.
// ---------------------------------------------------------------------------
const SIMBOLOS_DIAS = new Set(['dias', 'Dias', 'días', 'Días', 'Día', 'Dia']);

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
  'bas_moneda','bas_provincia','bas_pais','bas_localidad','bas_proyecto','bas_importacion',
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
  'bas_formulario','bas_formulario_parametro',
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
// Escapes reconocidos por MySQL dentro de un string literal (mysql_real_escape_string).
// Se usan para reconstruir el BYTE real detrás de cada secuencia \X, necesario
// para las columnas BYTEA (ver bytesToBytea más abajo) — el resto del pipeline
// (texto normal) no necesita esto, sigue viajando en su forma "escapada para
// Postgres" tal como antes.
// ---------------------------------------------------------------------------
const MYSQL_ESCAPES = { "'": 0x27, '"': 0x22, '\\': 0x5C, '0': 0x00, 'n': 0x0A, 'r': 0x0D, 't': 0x09, 'b': 0x08, 'Z': 0x1A, 'z': 0x1A };

// Bytes reales (Buffer) → literal bytea en formato hex de Postgres, usando E''
// para que el backslash se interprete siempre igual sin importar el valor de
// standard_conforming_strings. Doble backslash a propósito: el string literal
// E'...' debe decodificar a los 2 caracteres "\x" seguidos del hex, que es lo
// que el parser de bytea de Postgres reconoce como formato hexadecimal.
function bytesToBytea(buf) {
  const bs = String.fromCharCode(92); // '\'
  return `E'${bs}${bs}x${buf.toString('hex')}'`;
}

// Campos "Graphic" del ERP legacy (Delphi/VCL) no guardan el archivo de imagen
// crudo: anteponen un wrapper propietario (ruta de archivo original, "ROOT",
// padding) antes de la firma real de PNG/JPEG — confirmado con el logo de
// Thompson y French (wrapper de 89 bytes antes de la firma PNG). El consumidor
// (API de logo, PDF de recibos) espera la imagen "pelada" desde el byte 0, así
// que se recorta acá, en el único lugar que conoce el formato legacy.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function extractEmbeddedImage(buf) {
  const pngAt  = buf.indexOf(PNG_SIGNATURE);
  const jpegAt = buf.indexOf(JPEG_SIGNATURE);
  const at = [pngAt, jpegAt].filter(i => i !== -1).sort((a, b) => a - b)[0];
  if (at === undefined) return buf;   // no es un blob de imagen reconocible, se deja tal cual
  return at === 0 ? buf : buf.slice(at);
}

// ---------------------------------------------------------------------------
// Parser de VALUES para MySQL.
// Devuelve { tokens, rawBytes }: `tokens` son strings ya en formato listo para
// Postgres (comillas dobladas, backslashes de escape sin resolver — igual que
// antes); `rawBytes` es un array paralelo con el Buffer de bytes reales de
// cada string literal (undefined para NULL/números), usado solo por las
// columnas marcadas 'X' en COL_TYPES para reconstruir binarios (fotos, logos)
// en vez de descartarlos.
// Maneja: strings con \' y '', NULL, números.
// ---------------------------------------------------------------------------
function parseValueTokens(str) {
  const tokens = [];
  const rawBytes = [];
  let i = 0;

  while (i < str.length) {
    // saltar comas y espacios entre valores
    while (i < str.length && (str[i] === ',' || str[i] === ' ')) i++;
    if (i >= str.length || str[i] === ')') break;

    if (str[i] === "'") {
      // string literal — escanear hasta cierre de quote
      let out = "'";
      const bytes = [];
      i++;
      while (i < str.length) {
        const ch = str[i];
        if (ch === '\\') {
          const next = str[i + 1];
          if (next === "'") {                 // \' → ''
            out += "''"; bytes.push(0x27);
          } else if (next === '0') {           // \0 → strip (MySQL null byte escape)
            bytes.push(0x00);
          } else {                             // \X: se preserva tal cual para Postgres,
                                                // pero el byte real se resuelve por tabla
            out += ch + (next !== undefined ? next : '');
            const escByte = MYSQL_ESCAPES[next];
            bytes.push(escByte !== undefined ? escByte : (next !== undefined ? next.charCodeAt(0) : 0x5C));
          }
          i += 2;
          continue;
        }
        if (ch === "'" && str[i + 1] === "'") {
          out += "''"; bytes.push(0x27); i += 2; continue;
        }
        if (ch === "'") { out += "'"; i++; break; }

        const code = str.charCodeAt(i);
        if (code === 0x00) { i++; continue; }  // strip literal null bytes
        out += ch; bytes.push(code); i++;
      }
      tokens.push(out);
      rawBytes.push(Buffer.from(bytes));
    } else if (str.slice(i, i+4).toUpperCase() === 'NULL') {
      tokens.push('NULL'); rawBytes.push(undefined); i += 4;
    } else {
      // número u otro literal (sin comillas)
      let num = '';
      while (i < str.length && str[i] !== ',' && str[i] !== ')') {
        num += str[i]; i++;
      }
      tokens.push(num.trim());
      rawBytes.push(undefined);
    }
  }
  return { tokens, rawBytes };
}

// ---------------------------------------------------------------------------
// Devuelve el índice inmediatamente después del cierre de un string literal
// que empieza en str[i] (str[i] === "'"), respetando el escaping de MySQL
// (\' , '' , \0, y cualquier \X se trata como dos caracteres literales).
// No transforma nada, solo ubica el cierre real — para eso está parseValueTokens.
// ---------------------------------------------------------------------------
function skipStringLiteral(str, i) {
  i++; // saltar la comilla de apertura
  while (i < str.length) {
    const ch = str[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === "'" && str[i + 1] === "'") { i += 2; continue; }
    if (ch === "'") return i + 1;
    i++;
  }
  return i;
}

// ---------------------------------------------------------------------------
// Separa el contenido de un "VALUES (...), (...), ..." en los strings crudos
// de cada tupla (sin los paréntesis exteriores). Usado tanto al transformar
// INSERTs como al pre-escanear legajos de empleado.
//
// Tiene que ser consciente de comillas: columnas BYTEA (fotos, logos) guardan
// datos binarios crudos que pueden contener bytes '(' o ')' — si se cuenta la
// profundidad de paréntesis a ciegas, esos bytes cortan la tupla en el lugar
// equivocado y se pierden o corrompen filas (bug real detectado con una foto
// de empleado en el dump de "master").
// ---------------------------------------------------------------------------
function splitTuples(rest) {
  const tuples = [];
  let i = 0;
  while (i < rest.length) {
    while (i < rest.length && rest[i] !== '(') i++;
    if (i >= rest.length) break;
    const start = i + 1;
    i++;

    let depth = 1;
    while (i < rest.length && depth > 0) {
      const ch = rest[i];
      if (ch === "'") { i = skipStringLiteral(rest, i); continue; }
      if (ch === '(') { depth++; i++; continue; }
      if (ch === ')') { depth--; i++; continue; }
      i++;
    }

    tuples.push(rest.slice(start, i - 1));
  }
  return tuples;
}

// ---------------------------------------------------------------------------
// Resuelve el token de una columna contra el mapa de ids que le corresponda
// (empresa o empleado), si corresponde. Devuelve null si ningún resolutor
// aplica a esa tabla+columna (se procesa con las reglas normales).
// ---------------------------------------------------------------------------
function resolveIdToken(tableName, colName, tok, resolverMaps) {
  for (const [name, resolver] of Object.entries(ID_RESOLVERS)) {
    const cols = resolver.columns[tableName];
    if (!cols || !cols.includes(colName)) continue;

    if (tok === 'NULL') return { value: 'NULL', failed: false };

    const raw   = tok.startsWith("'") ? tok.slice(1, -1).replace(/''/g, "'") : tok;
    const numId = (resolverMaps[name] || {})[raw];
    if (numId === undefined) {
      const critical = resolver.critical === null || (resolver.critical[tableName] || []).includes(colName);
      return { value: 'NULL', failed: critical, resolver: name, raw };
    }
    return { value: String(numId), failed: false };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Convierte un array de tokens según los tipos de columna de la tabla.
// colNames: array de nombres de columna en el orden del MySQL dump (puede ser undefined).
// resolverMaps: { empresa: {srcId:numId}, empleado: {legajo:numId} }
// Devuelve { tokens, drop } — drop=true si algún id crítico no resolvió y la
// fila entera debe descartarse (ver ID_RESOLVERS.critical).
// ---------------------------------------------------------------------------
// Recorta un string ya en formato "escapado para Postgres" (bytes latin1 1:1)
// a maxLen bytes, sin cortar un carácter UTF-8 multibyte a la mitad — si el
// corte cae en medio de una secuencia, se descarta el carácter incompleto
// completo en vez de dejar bytes inválidos sueltos.
function trimIncompleteUtf8(str, maxLen) {
  let end = Math.min(str.length, maxLen);
  while (end > 0 && (str.charCodeAt(end - 1) & 0xC0) === 0x80) end--;   // bytes de continuación (10xxxxxx)
  if (end > 0 && str.charCodeAt(end - 1) >= 0xC0) end--;                // byte líder sin continuación
  return str.slice(0, end);
}

function convertTokens(tableName, tokens, colNames, resolverMaps, rawBytesArr) {
  const types    = COL_TYPES[tableName] || {};
  const defaults = NOT_NULL_DEFAULTS[tableName] || {};
  const limits   = VARCHAR_LIMITS[tableName] || {};
  let drop = false;

  const converted = tokens.map((tok, idx) => {
    const col     = idx + 1;           // 1-indexed (para COL_TYPES que usa posiciones fijas)
    const colName = colNames ? colNames[idx] : null;

    if (colName) {
      const resolved = resolveIdToken(tableName, colName, tok, resolverMaps);
      if (resolved) {
        if (resolved.failed) {
          drop = true;
          console.error(`  ADVERTENCIA: ${tableName}.${colName} = '${resolved.raw}' no está en el mapa de ${resolved.resolver}, se descarta la fila`);
        } else if (resolved.value === 'NULL' && resolved.raw !== undefined) {
          console.error(`  ADVERTENCIA: ${tableName}.${colName} = '${resolved.raw}' no está en el mapa de ${resolved.resolver}, se guarda NULL`);
        }
        return resolved.value;
      }
    }

    const type = types[col];
    if (type === 'X') {                // BYTEA → bytes reales (foto, logo), NULL si no hay dato
      const buf = rawBytesArr && rawBytesArr[idx];
      return (buf && buf.length) ? bytesToBytea(extractEmbeddedImage(buf)) : 'NULL';
    }

    if (type === 'B') {                // BOOLEAN
      // MySQL BIT(1) llega como un string literal de 1 byte crudo (0x00/0x01),
      // no como el carácter ASCII '0'/'1' — hay que mirar el byte real, no el
      // texto (que para 0x00, por el strip de \0, queda indistinguible de un
      // string vacío genuino).
      const buf = rawBytesArr && rawBytesArr[idx];
      if (buf) {
        if (buf.length === 0) return 'FALSE';
        if (buf.length === 1) return buf[0] === 0 ? 'FALSE' : 'TRUE';
      }
      if (tok === '0' || tok === "''") return 'FALSE';
      if (tok === '1')                 return 'TRUE';
      if (tok === 'NULL') return 'NULL';
      return tok;
    }

    // NOT NULL defaults (cuando el dump tiene NULL pero el schema no lo permite)
    if (tok === 'NULL' && colName && defaults[colName] !== undefined) {
      return defaults[colName];
    }

    // Truncar strings que exceden el límite VARCHAR
    if (colName && limits[colName] && tok.startsWith("'")) {
      const maxLen = limits[colName];
      const inner  = tok.slice(1, -1);  // quitar quotes externas
      if (inner.length > maxLen) {
        return "'" + trimIncompleteUtf8(inner, maxLen) + "'";
      }
    }

    return tok;
  });

  if (tableName === 'sld_concepto' && colNames) {
    const simboloIdx    = colNames.indexOf('simbolo_unidad');
    const decimalesIdx  = colNames.indexOf('decimales_unidad');
    const visibleIdx    = colNames.indexOf('unidad_visible');
    const simboloBlank  = simboloIdx === -1 || tokens[simboloIdx] === 'NULL' || tokens[simboloIdx] === "''";
    const decimalesBlank = decimalesIdx === -1 || tokens[decimalesIdx] === 'NULL';

    if (simboloIdx !== -1 && decimalesIdx !== -1 && !simboloBlank) {
      const simboloRaw = unquoteToken(tokens[simboloIdx]);
      // El dump viene declarado latin1 pero con bytes UTF-8 reales adentro (tabla
      // `latin1` volcada con `SET NAMES utf8`, ver cabecera del dump) — todo el
      // archivo se lee como latin1 para preservar bytes de imágenes tal cual, así
      // que un acento como "días" llega acá como el string mojibake "dÃ­as". Para
      // comparar contra literales limpios hay que revertir esa doble decodificación
      // (no afecta lo que se escribe: simbolo_unidad sale intacto, solo se lee acá).
      const simbolo = Buffer.from(simboloRaw, 'latin1').toString('utf8').trim();
      if (SIMBOLOS_DIAS.has(simbolo)) converted[decimalesIdx] = '0';
    }

    // Sin símbolo de unidad y sin decimales configurados: no hay nada que mostrar
    // en la columna "Unidad" del recibo, así que no tiene sentido dejarla visible.
    if (visibleIdx !== -1 && simboloBlank && decimalesBlank) converted[visibleIdx] = 'FALSE';
  }

  return { tokens: converted, drop };
}

// ---------------------------------------------------------------------------
// bas_formulario / bas_formulario_parametro (legacy): tabla única compartida
// por varios módulos del ERP vía la columna `tipo` (FACTURA_VTA, ITEM, COBRO,
// SUELDO, LIBRO_SUELDO, etc.). Acá solo nos interesan SUELDO → recibo y
// LIBRO_SUELDO → libro; el resto son de otros módulos y se descartan.
//
// A diferencia del resto de las tablas (mapeo 1:1 de columnas), acá hay que:
//  - elegir la tabla destino según el valor de `tipo` de cada fila,
//  - renombrar/reordenar columnas (id→nombre, top_margin→margen_superior, etc.),
//  - agregar `empresa` (antes cada empresa era una base MySQL separada; ahora
//    conviven todas en sld_formulario_recibo/libro, con UNIQUE(empresa,nombre)),
//  - resolver formulario_hno (auto-referencia) y bas_formulario_parametro.formulario
//    (FK al padre) contra el `id` numérico nuevo — que no existe todavía en este
//    script porque lo asigna Postgres al insertar (SERIAL). Se resuelve con un
//    INSERT ... SELECT / UPDATE ... FROM que busca por (empresa, nombre) en vez
//    de por id, ya en el propio SQL generado (no hace falta un mapa en JS).
// ---------------------------------------------------------------------------
const FORMULARIO_TIPO_TABLE = { SUELDO: 'sld_formulario_recibo', LIBRO_SUELDO: 'sld_formulario_libro' };

function sqlLiteral(str) {
  return `'${str.replace(/'/g, "''")}'`;
}

// Token ya parseado por parseValueTokens (con comillas PG y '' escapado) → valor real.
function unquoteToken(tok) {
  if (tok === undefined || tok === 'NULL') return null;
  if (tok.startsWith("'")) return tok.slice(1, -1).replace(/''/g, "'");
  return tok;
}

function truncateLiteral(tok, maxLen) {
  const raw = unquoteToken(tok);
  if (raw === null) return 'NULL';
  return sqlLiteral(raw.length > maxLen ? raw.slice(0, maxLen) : raw);
}

const FORMULARIO_COLS = ['empresa', 'nombre', 'descripcion', 'orientacion', 'pagina', 'margen_superior',
  'margen_inferior', 'margen_izquierdo', 'margen_derecho', 'formula_archivo', 'columnas', 'filas',
  'copias', 'propiedad', 'etiquetas', 'orden'];

function transformBasFormulario(line, colNames, empresaNum) {
  const valuesIdx = line.indexOf(' VALUES ');
  if (valuesIdx === -1 || !colNames.length) return '';
  const rest = line.slice(valuesIdx + 8);

  const byTable = { sld_formulario_recibo: [], sld_formulario_libro: [] };
  const hermanos = { sld_formulario_recibo: [], sld_formulario_libro: [] };

  for (const tContent of splitTuples(rest)) {
    const { tokens } = parseValueTokens(tContent);
    const row = {};
    colNames.forEach((c, i) => { row[c] = tokens[i]; });

    const targetTable = FORMULARIO_TIPO_TABLE[unquoteToken(row.tipo)];
    if (!targetTable) continue;   // otro módulo del ERP (FACTURA_VTA, ITEM, etc.) — no aplica

    const nombre = unquoteToken(row.id);
    if (!nombre) continue;

    const etiquetas = row.etiquetas === '1' ? 'TRUE' : (row.etiquetas === '0' ? 'FALSE' : 'NULL');

    byTable[targetTable].push({
      empresa: String(empresaNum),
      nombre: sqlLiteral(nombre),
      descripcion: row.descripcion,
      orientacion: row.orientation,
      pagina: row.page_size,
      margen_superior: row.top_margin,
      margen_inferior: row.bottom_margin,
      margen_izquierdo: row.left_margin,
      margen_derecho: row.right_margin,
      formula_archivo: row.archivo,
      columnas: row.columnas,
      filas: row.filas,
      copias: row.copias,
      propiedad: row.propiedad,
      etiquetas,
      orden: row.orden,
    });

    const hno = unquoteToken(row.formulario_hno);
    if (hno) hermanos[targetTable].push({ nombre, hno });
  }

  const statements = [];
  for (const [table, rows] of Object.entries(byTable)) {
    if (!rows.length) continue;
    const tuples = rows.map(r => `(${FORMULARIO_COLS.map(c => r[c]).join(',')})`).join(',');
    statements.push(`INSERT INTO ${table} (${FORMULARIO_COLS.join(',')}) VALUES ${tuples} ON CONFLICT (empresa, nombre) DO NOTHING;`);
  }
  for (const [table, pairs] of Object.entries(hermanos)) {
    for (const { nombre, hno } of pairs) {
      statements.push(
        `UPDATE ${table} AS t SET formulario_hermano = h.id FROM ${table} AS h ` +
        `WHERE t.empresa = ${empresaNum} AND t.nombre = ${sqlLiteral(nombre)} AND h.empresa = ${empresaNum} AND h.nombre = ${sqlLiteral(hno)};`
      );
    }
  }
  return statements.join('\n');
}

const FORMULARIO_PARAMETRO_COLS = ['formulario', 'parametro', 'descripcion', 'texto', 'x', 'y', 'ancho', 'alto',
  'orden', 'alignment', 'font', 'border_color', 'background_color', 'auto_height', 'print', 'condicion'];

function transformBasFormularioParametro(line, colNames, empresaNum) {
  const valuesIdx = line.indexOf(' VALUES ');
  if (valuesIdx === -1 || !colNames.length) return '';
  const rest = line.slice(valuesIdx + 8);

  const statements = [];
  for (const tContent of splitTuples(rest)) {
    const { tokens } = parseValueTokens(tContent);
    const row = {};
    colNames.forEach((c, i) => { row[c] = tokens[i]; });

    const targetTable = FORMULARIO_TIPO_TABLE[unquoteToken(row.tipo)];
    if (!targetTable) continue;

    const formularioNombre = unquoteToken(row.formulario);
    if (!formularioNombre) continue;

    const values = {
      parametro: row.parametro,
      descripcion: row.descripcion,
      texto: truncateLiteral(row.texto, 255),
      x: row.x, y: row.y, ancho: row.width, alto: row.height, orden: row.orden,
      alignment: row.alignment, font: row.font,
      border_color: row.border_color, background_color: row.background_color,
      auto_height: row.auto_height === '1' ? 'TRUE' : 'FALSE',
      print: row.print === '0' ? 'FALSE' : 'TRUE',
      condicion: row.condicion,
    };

    const selectCols = ['f.id', ...FORMULARIO_PARAMETRO_COLS.slice(1).map(c => values[c])].join(',');
    statements.push(
      `INSERT INTO ${targetTable}_parametro (${FORMULARIO_PARAMETRO_COLS.join(',')}) ` +
      `SELECT ${selectCols} FROM ${targetTable} f WHERE f.empresa = ${empresaNum} AND f.nombre = ${sqlLiteral(formularioNombre)} ` +
      `ON CONFLICT DO NOTHING;`
    );
  }
  return statements.join('\n');
}

// ---------------------------------------------------------------------------
// Transforma una línea de INSERT completa.
// colNames: nombres de columna en orden MySQL (para INSERT con columnas explícitas).
// resolverMaps: ver convertTokens.
// ---------------------------------------------------------------------------
function transformInsert(line, tableName, resolverMaps, colNames) {
  // Los backticks de MySQL (identificadores) solo pueden vivir en la parte
  // "INSERT INTO `tabla` (`col1`,...)" — quitarlos de la línea completa
  // corrompería cualquier byte 0x60 crudo dentro de datos binarios (BYTEA)
  // en la sección VALUES (bug real, encontrado al preservar logos/fotos:
  // un PNG de 70KB tiene ese byte cientos de veces).
  const preValuesIdx = line.indexOf(' VALUES ');
  line = preValuesIdx === -1
    ? line.replace(/`/g, '')
    : line.slice(0, preValuesIdx).replace(/`/g, '') + line.slice(preValuesIdx);
  line = line.replace(/'0000-00-00 00:00:00'/g, 'NULL');
  line = line.replace(/'0000-00-00'/g, 'NULL');

  if (tableName === 'bas_formulario') return transformBasFormulario(line, colNames, resolverMaps.empresaNum);
  if (tableName === 'bas_formulario_parametro') return transformBasFormularioParametro(line, colNames, resolverMaps.empresaNum);

  const needsConversion = COL_TYPES[tableName] || NOT_NULL_DEFAULTS[tableName] || VARCHAR_LIMITS[tableName]
    || Object.values(ID_RESOLVERS).some(r => r.columns[tableName]);
  const needsColNames   = colNames && colNames.length > 0;

  if (needsConversion || needsColNames) {
    const valuesIdx = line.indexOf(' VALUES ');
    if (valuesIdx !== -1) {
      // sld_empleado: la columna 'id' del dump MySQL es el legajo. Se preserva
      // tal cual en una columna nueva 'legajo' (al lado de 'id'), mientras que
      // 'id' pasa a llevar el id numérico nuevo (resuelto vía ID_RESOLVERS.empleado).
      const legajoPos = (tableName === 'sld_empleado') ? colNames.indexOf('id') : -1;
      let outColNames = colNames;
      if (legajoPos !== -1) {
        outColNames = [...colNames.slice(0, legajoPos + 1), 'legajo', ...colNames.slice(legajoPos + 1)];
      }
      const needsEmpresaCol = TABLES_NEEDING_EMPRESA_COLUMN.has(tableName);
      if (needsEmpresaCol) outColNames = [...outColNames, 'empresa'];

      const colList = needsColNames ? `(${outColNames.join(',')}) ` : '';
      const prefix  = `INSERT INTO ${tableName} ${colList}VALUES `;
      const rest    = line.slice(valuesIdx + 8);

      // sys_empresa puede traer una fila "fantasma" duplicada (mismo caso que la
      // sección 8 de MIGRACION_BITACORA.md) que no resuelve contra el mapa de
      // empresa y se descarta — pero a veces esa fila fantasma es la única que
      // tiene el logo/baja (BYTEA) cargado, mientras la fila real que sí resuelve
      // lo tiene en NULL. La fila real referencia a la fantasma vía su propia
      // columna `empresa` (auto-referencia de "grupo económico"), así que se usa
      // ese link para "donar" el binario a la fila real antes de descartar la
      // fantasma.
      const empresaLogoDonors = tableName === 'sys_empresa' ? {} : null;
      if (empresaLogoDonors) {
        const idIdx   = colNames.indexOf('id');
        const logoIdx = colNames.indexOf('logo');
        const bajaIdx = colNames.indexOf('baja');
        for (const tContent of splitTuples(rest)) {
          const { tokens: t, rawBytes: rb } = parseValueTokens(tContent);
          if (idIdx === -1) continue;
          const idRaw = unquoteToken(t[idIdx]);
          if (idRaw === null || (resolverMaps.empresa && resolverMaps.empresa[idRaw] !== undefined)) continue;
          const logoBuf = logoIdx !== -1 ? rb[logoIdx] : undefined;
          const bajaBuf = bajaIdx !== -1 ? rb[bajaIdx] : undefined;
          if ((logoBuf && logoBuf.length) || (bajaBuf && bajaBuf.length)) {
            empresaLogoDonors[idRaw] = { logoBuf, bajaBuf };
          }
        }
      }

      const tuples = [];
      for (const tContent of splitTuples(rest)) {
        const { tokens, rawBytes } = parseValueTokens(tContent);

        if (empresaLogoDonors) {
          const empresaRefIdx = colNames.indexOf('empresa');
          const refRaw = empresaRefIdx !== -1 ? unquoteToken(tokens[empresaRefIdx]) : null;
          const donor  = refRaw !== null ? empresaLogoDonors[refRaw] : undefined;
          if (donor) {
            const logoIdx = colNames.indexOf('logo');
            const bajaIdx = colNames.indexOf('baja');
            if (logoIdx !== -1 && (!rawBytes[logoIdx] || !rawBytes[logoIdx].length) && donor.logoBuf && donor.logoBuf.length) {
              rawBytes[logoIdx] = donor.logoBuf;
              console.error(`  Logo trasplantado desde fila duplicada '${refRaw}' de sys_empresa a la fila real`);
            }
            if (bajaIdx !== -1 && (!rawBytes[bajaIdx] || !rawBytes[bajaIdx].length) && donor.bajaBuf && donor.bajaBuf.length) {
              rawBytes[bajaIdx] = donor.bajaBuf;
            }
          }
        }

        const { tokens: converted, drop } = convertTokens(tableName, tokens, colNames, resolverMaps, rawBytes);
        if (drop) {
          console.error(`  Fila de ${tableName} descartada (id sin resolver): (${tokens.join(',')})`);
          continue;
        }

        let finalTokens = converted;
        if (legajoPos !== -1) {
          finalTokens = [...converted.slice(0, legajoPos + 1), tokens[legajoPos], ...converted.slice(legajoPos + 1)];
        }
        if (needsEmpresaCol) finalTokens = [...finalTokens, String(resolverMaps.empresaNum)];
        tuples.push(`(${finalTokens.join(',')})`);
      }

      // Si se descartaron todas las tuplas (p.ej. una tabla con datos huérfanos
      // apuntando a un id que no resolvió), "VALUES" sin ninguna tupla es SQL
      // inválido — se omite el statement entero en vez de emitirlo roto.
      if (tuples.length === 0) return '';

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
// Asigna a cada dump un id numérico (1, 2, 3...) en orden alfabético de
// archivo — el mismo orden en que ya estaban documentados los IDs canónicos
// en MIGRACION_BITACORA.md.
//
// El id original de MySQL (`srcId`) NO sirve como clave de un mapa global:
// tres de los seis dumps comparten el mismo id de origen ('nacional', bug ya
// documentado en la bitácora), porque cada uno es una base MySQL independiente
// con su propio espacio de ids — 'nacional' en un dump no tiene relación con
// 'nacional' en otro. Por eso el mapeo srcId → id numérico se arma por
// archivo (ver processDump), y esta función solo decide QUÉ número le toca a
// cada archivo.
// ---------------------------------------------------------------------------
function assignEmpresaNumbers(dumpBasenames) {
  const numByFile = new Map();
  dumpBasenames.forEach((basename, i) => numByFile.set(basename, i + 1));
  return numByFile;
}

// ---------------------------------------------------------------------------
// Extrae todos los legajos (columna 'id' del dump MySQL) de las filas de
// sld_empleado en un dump. Mismo motivo que assignEmpresaNumbers: el legajo
// es único dentro de una base MySQL (una por empresa) pero no entre ellas, así
// que el mapeo legajo → id numérico se arma por archivo (ver buildEmpleadoIdMaps).
// ---------------------------------------------------------------------------
function collectEmpleadoLegajos(content) {
  const createRe = /CREATE TABLE `sld_empleado` \(([\s\S]*?)\) ENGINE=/;
  const cm = createRe.exec(content);
  if (!cm) return [];
  const colNames = extractMysqlColumns(cm[1]);
  const idPos = colNames.indexOf('id');
  if (idPos === -1) return [];

  const legajos = [];
  let pending = '';
  const flush = () => {
    const valuesIdx = pending.indexOf(' VALUES ');
    if (valuesIdx !== -1) {
      const rest = pending.slice(valuesIdx + 8);
      for (const tContent of splitTuples(rest)) {
        const tok = parseValueTokens(tContent).tokens[idPos];
        if (tok && tok.startsWith("'")) legajos.push(tok.slice(1, -1).replace(/''/g, "'"));
      }
    }
    pending = '';
  };

  for (const raw of content.split('\n')) {
    const line = raw.trimEnd();
    if (line.startsWith('INSERT INTO `sld_empleado`')) {
      if (pending) flush();
      pending = line;
    } else if (pending) {
      pending += '\n' + line;
    }
    if (pending && line.endsWith(';')) flush();
  }
  if (pending) flush();

  return legajos;
}

// ---------------------------------------------------------------------------
// Arma, por archivo, el mapa { legajo -> id numérico de sld_empleado }. El id
// numérico se asigna con un contador único que sigue creciendo a través de
// todos los archivos (a diferencia del legajo, el id nuevo sí es global:
// una sola tabla sld_empleado para todas las empresas).
// ---------------------------------------------------------------------------
function buildEmpleadoIdMaps(baseDir, dumpBasenames) {
  const mapsByFile = new Map();
  let next = 1;
  for (const basename of dumpBasenames) {
    const content = fs.readFileSync(path.join(baseDir, basename), 'latin1');
    const localMap = {};
    for (const legajo of collectEmpleadoLegajos(content)) {
      if (localMap[legajo] === undefined) localMap[legajo] = next++;
    }
    mapsByFile.set(basename, localMap);
  }
  return mapsByFile;
}

// ---------------------------------------------------------------------------
// Procesa un dump completo y devuelve el SQL para PostgreSQL.
// empresaNum: id numérico ya asignado a este archivo (ver assignEmpresaNumbers).
// empleadoIdMap: mapa { legajo -> id numérico } de este archivo (ver buildEmpleadoIdMaps).
// ---------------------------------------------------------------------------
function processDump(inputFile, empresaNum, empleadoIdMap) {
  const content    = fs.readFileSync(inputFile, 'latin1');
  const srcId      = detectEmpresaId(content);
  const empresaStr = canonicalId(inputFile);   // solo para nombre de archivo / logs
  const resolverMaps = {
    empresa:  srcId ? { [srcId]: empresaNum } : {},
    empleado: empleadoIdMap || {},
    empresaNum,
  };

  console.error(`  ID original: ${srcId ?? '(no encontrado)'} → ID canónico: ${empresaStr} → id numérico: ${empresaNum ?? '(sin asignar)'}`);
  console.error(`  Legajos mapeados: ${Object.keys(resolverMaps.empleado).length}`);

  const outputLines = [
    `-- Generado por migrate-from-mysql.js`,
    `-- Origen: ${path.basename(inputFile)}`,
    `-- Empresa: ${empresaStr} (id original MySQL: ${srcId ?? '?'}) → sys_empresa.id = ${empresaNum ?? '?'}`,
    '',
    'BEGIN;',
    'SET session_replication_role = replica;',
    'SET standard_conforming_strings = off;',  // interpreta \' igual que MySQL
    '',
  ];

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
    outputLines.push(transformInsert(stmt, tableName, resolverMaps, colNames));
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
  if (empresaNum !== undefined) {
    outputLines.push(`UPDATE sld_empleado SET empresa = ${empresaNum} WHERE empresa IS NULL;`);
    outputLines.push('');
  }
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

// Los ids numéricos (de empresa y de empleado) se asignan por posición
// alfabética / orden de aparición entre los dumps de BACKUP_DIR —
// independientemente de si se corre --all o se convierte un solo archivo,
// para que el número asignado a cada empresa/empleado sea siempre el mismo.
const allDumps = fs.existsSync(BACKUP_DIR)
  ? fs.readdirSync(BACKUP_DIR).filter(f => /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.sql$/.test(f)).sort()
  : [];
const empresaNumByFile      = assignEmpresaNumbers(allDumps);
const empleadoIdMapsByFile  = buildEmpleadoIdMaps(BACKUP_DIR, allDumps);

if (process.argv[2] === '--all') {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.error(`Procesando ${allDumps.length} dumps...\n`);

  for (const dump of allDumps) {
    const inputFile  = path.join(BACKUP_DIR, dump);
    const outName    = `${canonicalId(inputFile)}_pg.sql`;
    const outputFile = path.join(DATA_DIR, outName);

    console.error(`[${dump}]`);
    const sql = processDump(inputFile, empresaNumByFile.get(dump), empleadoIdMapsByFile.get(dump));
    fs.writeFileSync(outputFile, sql, 'latin1');
    console.error(`  → ${outName}\n`);
  }

  // Se carga después de los *_pg.sql (orden alfabético, "zzz" ordena último)
  // para que las empresas/empleados creados desde la UI sigan numerando a
  // partir del último id usado por la migración.
  const setvalFile = path.join(DATA_DIR, 'zzz_setval_pg.sql');
  fs.writeFileSync(
    setvalFile,
    `SELECT setval('sys_empresa_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sys_empresa));\n` +
    `SELECT setval('sld_empleado_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sld_empleado));\n`,
    'utf8'
  );
  console.error(`  → zzz_setval_pg.sql (sincroniza las secuencias de sys_empresa.id y sld_empleado.id)\n`);

  console.error('Listo. Archivos en db/postgresql/data/');

} else {
  const inputFile  = process.argv[2];
  const outputFile = process.argv[3];

  if (!inputFile) {
    console.error('Uso: node migrate-from-mysql.js <archivo.sql> [salida.sql]');
    console.error('      node migrate-from-mysql.js --all');
    process.exit(1);
  }

  const baseName = path.basename(inputFile);
  let empresaNum = empresaNumByFile.get(baseName);
  let empleadoIdMap = empleadoIdMapsByFile.get(baseName);
  if (empresaNum === undefined) {
    // Archivo fuera de db/mysql/data: no tiene una posición asignada.
    empresaNum = 1;
    empleadoIdMap = {};
    console.error(`  AVISO: '${inputFile}' no está en ${BACKUP_DIR}; se le asignan ids numéricos desde 1 (pueden no ser únicos)`);
  }

  console.error(`[${baseName}]`);
  const sql = processDump(inputFile, empresaNum, empleadoIdMap);

  if (outputFile) {
    fs.writeFileSync(outputFile, sql, 'latin1');
    console.error(`Escrito: ${outputFile}`);
  } else {
    process.stdout.write(Buffer.from(sql, 'latin1'));
  }
}
