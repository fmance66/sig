// Evaluador acotado del DSL de fórmulas legacy. Nació con el vocabulario de
// sld_concepto (formula_unidad, formula_importe, formula_unitario,
// formula_condicion) y sld_formula_auxiliar, y ahora es genérico: el
// tokenizer/parser/evaluador no conocen palabras de ningún módulo particular,
// reciben un "engineConfig" (variables/funciones/alias conocidos) y lo
// consultan en cada paso. `evaluateFormula(expr, context)` sin tercer
// argumento sigue evaluando con el vocabulario de Sueldos (compatibilidad
// hacia atrás con todos los llamadores existentes). Ver formulaEngineAsiento.js
// para el vocabulario de fórmulas de asientos contables (segundo consumidor,
// motivo de esta generalización).
//
// Cubre: aritmética (+ - * /, "+" concatena si algún lado es texto),
// comparaciones (> < >= <= = <>), lógicos (AND OR NOT), IF(cond, then, else)
// anidable, paréntesis, funciones (numéricas o de "etiqueta" según las
// declare el engineConfig), referencias a conceptos del mismo recibo (#id /
// Gid), el literal "?" (placeholder legacy de un combo sin completar, se lee
// como el string "?" en vez de crashear) y variables de contexto fijas.
//
// NO cubre (se detecta en el parseo y se levanta UnsupportedFormulaError, sin
// crashear el resto del recibo): funciones/variables no declaradas en el
// engineConfig activo (para Sueldos: RECIBOS(), CONCEPTOS(), FAMILIARES(),
// NOVEDADES(), TABLA(), ACUMULADO_GANANCIA(), RETENCION_FIJA/PORCENTAJE(),
// ADDDAY(), macros de sld_formula_auxiliar).

class FormulaSyntaxError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FormulaSyntaxError';
  }
}

class UnsupportedFormulaError extends Error {
  constructor(token) {
    super(`Función o variable no soportada: ${token}`);
    this.name = 'UnsupportedFormulaError';
    this.token = token;
  }
}

// engineConfig de Sueldos (comportamiento histórico, usado por defecto).
const KNOWN_VARIABLES = new Set([
  'UNIDAD', 'IMPORTE', 'UNIDAD_MANUAL', 'IMPORTE_MANUAL',
  'SUELDO', 'ADICIONAL', 'DIAS', 'HORAS', 'HORAS_CONVENIO',
  'ANTIGUEDAD', 'ANTIGUEDAD_MESES', 'ANTIGUEDAD_DIAS',
  'NUMERO_RECIBO', 'FECHA', 'FECHA_DESDE', 'FECHA_HASTA',
  'EMPLEADO_JORNAL',
  'TOTAL_REMUNERATIVO', 'TOTAL_NO_REMUNERATIVO', 'TOTAL_DESCUENTO', 'TOTAL_CONTRIBUCION',
  'SUELDO_BRUTO', 'SUELDO_NETO',
]);

// Alias del DSL legacy: "UNIDADXTECLADO"/"IMPORTEXTECLADO" ("unidad/importe por
// teclado") son el mismo concepto que UNIDAD_MANUAL/IMPORTE_MANUAL, con otro
// nombre — no una función sin soportar. Varias empresas migradas los usan
// dentro de fórmulas reales de contribuciones (ej. UNIDADXTECLADO/100 * base),
// no solo como passthrough puro.
const VARIABLE_ALIASES = {
  UNIDADXTECLADO: 'UNIDAD_MANUAL',
  IMPORTEXTECLADO: 'IMPORTE_MANUAL',
};

// Funciones de Sueldos: todas reciben expresiones evaluadas como argumentos
// ("mode: expression", el default — ver parseArgsForFunction más abajo).
const KNOWN_FUNCTIONS = {
  ROUND: {
    apply(args) {
      // DSL legacy: el segundo argumento es el múltiplo al que se redondea
      // (ROUND(x,1) = peso entero más cercano, ROUND(x,100) = centena más
      // cercana), no la cantidad de decimales como en el ROUND de SQL.
      const unidad = args.length > 1 ? toNumber(args[1]) : 1;
      if (!unidad) return Math.round(toNumber(args[0]));
      return Math.round(toNumber(args[0]) / unidad) * unidad;
    },
  },
  INTEGER: { apply: args => Math.trunc(toNumber(args[0])) },
  ABS: { apply: args => Math.abs(toNumber(args[0])) },
  MAX: { apply: args => Math.max(...args.map(toNumber)) },
  MIN: { apply: args => Math.min(...args.map(toNumber)) },
  MONTH: {
    apply(args) {
      const v = args[0];
      const date = v instanceof Date ? v : new Date(v);
      return date.getMonth() + 1;
    },
  },
};

const SUELDOS_ENGINE = { variables: KNOWN_VARIABLES, functions: KNOWN_FUNCTIONS, aliases: VARIABLE_ALIASES };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

function tokenize(source) {
  const tokens = [];
  let i = 0;
  const n = source.length;

  const isDigit = c => c >= '0' && c <= '9';
  const isIdentStart = c => /[A-Za-zÁÉÍÓÚÑáéíóúñ_]/.test(c);
  const isIdentChar = c => /[A-Za-z0-9ÁÉÍÓÚÑáéíóúñ_]/.test(c);

  while (i < n) {
    const c = source[i];

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }

    if (c === '#') {
      let j = i + 1;
      while (j < n && isDigit(source[j])) j++;
      if (j === i + 1) throw new FormulaSyntaxError(`Referencia de concepto inválida en posición ${i}`);
      tokens.push({ type: 'CONCEPTREF', value: source.slice(i + 1, j) });
      i = j;
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(source[i + 1]))) {
      let j = i;
      while (j < n && isDigit(source[j])) j++;
      if (source[j] === '.' && isDigit(source[j + 1])) {
        j++;
        while (j < n && isDigit(source[j])) j++;
      }
      tokens.push({ type: 'NUMBER', value: Number(source.slice(i, j)) });
      i = j;
      continue;
    }

    if (c === '.' && source[i + 1] === '.') {
      tokens.push({ type: 'RANGE' });
      i += 2;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < n && isIdentChar(source[j])) j++;
      const word = source.slice(i, j);
      const upper = word.toUpperCase();
      if (/^G[0-9]+$/.test(upper)) {
        tokens.push({ type: 'CONCEPTREF', value: upper.slice(1) });
      } else if (upper === 'IF') {
        tokens.push({ type: 'IF' });
      } else if (upper === 'AND') {
        tokens.push({ type: 'AND' });
      } else if (upper === 'OR') {
        tokens.push({ type: 'OR' });
      } else if (upper === 'NOT') {
        tokens.push({ type: 'NOT' });
      } else if (upper === 'TRUE') {
        tokens.push({ type: 'BOOLEAN', value: true });
      } else if (upper === 'FALSE') {
        tokens.push({ type: 'BOOLEAN', value: false });
      } else {
        tokens.push({ type: 'IDENT', value: upper });
      }
      i = j;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n && source[j] !== quote) j++;
      tokens.push({ type: 'STRING', value: source.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    if (c === '>' && source[i + 1] === '=') { tokens.push({ type: 'GTE' }); i += 2; continue; }
    if (c === '<' && source[i + 1] === '=') { tokens.push({ type: 'LTE' }); i += 2; continue; }
    if (c === '<' && source[i + 1] === '>') { tokens.push({ type: 'NEQ' }); i += 2; continue; }
    if (c === '>') { tokens.push({ type: 'GT' }); i++; continue; }
    if (c === '<') { tokens.push({ type: 'LT' }); i++; continue; }
    if (c === '=') { tokens.push({ type: 'EQ' }); i++; continue; }
    if (c === '+') { tokens.push({ type: 'PLUS' }); i++; continue; }
    if (c === '-') { tokens.push({ type: 'MINUS' }); i++; continue; }
    if (c === '*') { tokens.push({ type: 'STAR' }); i++; continue; }
    if (c === '/') { tokens.push({ type: 'SLASH' }); i++; continue; }
    if (c === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (c === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }
    if (c === ',') { tokens.push({ type: 'COMMA' }); i++; continue; }

    // Placeholder legacy de un combo (ej. de rubro) que quedó sin completar en
    // el dato real (ver cnt_modelo_movimiento.formula de Master, línea
    // "IF(RUBRO=?,...)"): se lee como el string "?" en vez de romper el
    // parseo — la comparación da simplemente false, igual que en el legacy.
    if (c === '?') { tokens.push({ type: 'QUESTION' }); i++; continue; }

    throw new FormulaSyntaxError(`Carácter inesperado '${c}' en posición ${i}`);
  }

  tokens.push({ type: 'EOF' });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent) -> AST
// ---------------------------------------------------------------------------

function parse(source, engineConfig) {
  const { variables, functions, aliases = {} } = engineConfig;
  const tokens = tokenize(source);
  let pos = 0;

  const peek = () => tokens[pos];
  const advance = () => tokens[pos++];
  const check = type => peek().type === type;
  function expect(type) {
    if (!check(type)) throw new FormulaSyntaxError(`Se esperaba ${type} pero se encontró ${peek().type}`);
    return advance();
  }

  function parseExpression() { return parseOr(); }

  function parseOr() {
    let node = parseAnd();
    while (check('OR')) { advance(); node = { type: 'OR', left: node, right: parseAnd() }; }
    return node;
  }

  function parseAnd() {
    let node = parseNot();
    while (check('AND')) { advance(); node = { type: 'AND', left: node, right: parseNot() }; }
    return node;
  }

  function parseNot() {
    if (check('NOT')) { advance(); return { type: 'NOT', operand: parseNot() }; }
    return parseComparison();
  }

  const COMPARISON_OPS = { GT: '>', LT: '<', GTE: '>=', LTE: '<=', EQ: '=', NEQ: '<>' };

  function parseComparison() {
    let node = parseAdditive();
    if (COMPARISON_OPS[peek().type]) {
      const op = COMPARISON_OPS[advance().type];
      node = { type: 'COMPARE', op, left: node, right: parseAdditive() };
    }
    return node;
  }

  function parseAdditive() {
    let node = parseTerm();
    while (check('PLUS') || check('MINUS')) {
      const op = advance().type === 'PLUS' ? '+' : '-';
      node = { type: 'BINOP', op, left: node, right: parseTerm() };
    }
    return node;
  }

  function parseTerm() {
    let node = parseUnary();
    while (check('STAR') || check('SLASH')) {
      const op = advance().type === 'STAR' ? '*' : '/';
      node = { type: 'BINOP', op, left: node, right: parseUnary() };
    }
    return node;
  }

  function parseUnary() {
    if (check('MINUS')) { advance(); return { type: 'NEG', operand: parseUnary() }; }
    if (check('PLUS')) { advance(); return parseUnary(); }
    return parsePrimary();
  }

  function parseArgs() {
    const args = [];
    if (!check('RPAREN')) {
      args.push(parseExpression());
      while (check('COMMA')) { advance(); args.push(parseExpression()); }
    }
    expect('RPAREN');
    return args;
  }

  // Funciones con mode:'ident' (ej. IMPUESTOS(IVA)) reciben una etiqueta
  // suelta como argumento, no una expresión a evaluar — IVA no es una
  // variable de contexto, es un valor categórico fijo.
  function parseIdentArgs() {
    const args = [];
    if (!check('RPAREN')) {
      args.push({ type: 'STRING', value: expect('IDENT').value });
      while (check('COMMA')) { advance(); args.push({ type: 'STRING', value: expect('IDENT').value }); }
    }
    expect('RPAREN');
    return args;
  }

  function parsePrimary() {
    const tok = peek();

    if (tok.type === 'NUMBER') { advance(); return { type: 'NUMBER', value: tok.value }; }
    if (tok.type === 'BOOLEAN') { advance(); return { type: 'BOOLEAN', value: tok.value }; }
    if (tok.type === 'STRING') { advance(); return { type: 'STRING', value: tok.value }; }
    if (tok.type === 'QUESTION') { advance(); return { type: 'STRING', value: '?' }; }
    if (tok.type === 'CONCEPTREF') { advance(); return { type: 'CONCEPTREF', id: tok.value }; }

    if (tok.type === 'LPAREN') {
      advance();
      const node = parseExpression();
      expect('RPAREN');
      return node;
    }

    if (tok.type === 'IF') {
      advance();
      expect('LPAREN');
      const cond = parseExpression();
      expect('COMMA');
      const thenExpr = parseExpression();
      expect('COMMA');
      const elseExpr = parseExpression();
      expect('RPAREN');
      return { type: 'IF', cond, then: thenExpr, else: elseExpr };
    }

    if (tok.type === 'IDENT') {
      advance();
      const name = tok.value;
      if (check('LPAREN')) {
        advance();
        // Se valida el nombre ANTES de parsear los argumentos: las funciones no
        // soportadas (RECIBOS, TABLA, etc.) usan una sintaxis de argumentos propia
        // (rangos con '..', columnas de tabla) que este parser no intenta entender.
        const funcDef = functions[name];
        if (!funcDef) throw new UnsupportedFormulaError(name);
        const args = funcDef.mode === 'ident' ? parseIdentArgs() : parseArgs();
        return { type: 'CALL', name, args };
      }
      const resolvedName = aliases[name] || name;
      if (!variables.has(resolvedName)) throw new UnsupportedFormulaError(name);
      return { type: 'VARIABLE', name: resolvedName };
    }

    throw new FormulaSyntaxError(`Token inesperado: ${tok.type}`);
  }

  const ast = parseExpression();
  expect('EOF');
  return ast;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

function toNumber(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'boolean') return v ? 1 : 0;
  return Number(v) || 0;
}

function toBoolean(v) {
  if (typeof v === 'boolean') return v;
  return toNumber(v) !== 0;
}

function compare(op, a, b) {
  const av = a instanceof Date || b instanceof Date ? toNumber(a) : a;
  const bv = a instanceof Date || b instanceof Date ? toNumber(b) : b;
  switch (op) {
    case '>': return av > bv;
    case '<': return av < bv;
    case '>=': return av >= bv;
    case '<=': return av <= bv;
    case '=': return av === bv;
    case '<>': return av !== bv;
    default: throw new FormulaSyntaxError(`Operador de comparación desconocido: ${op}`);
  }
}

function toDisplayString(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function evalNode(node, context, engineConfig) {
  switch (node.type) {
    case 'NUMBER': return node.value;
    case 'BOOLEAN': return node.value;
    case 'STRING': return node.value;

    case 'VARIABLE': {
      const v = context.variables ? context.variables[node.name] : undefined;
      return v === undefined || v === null ? 0 : v;
    }

    case 'CONCEPTREF': {
      if (!context.resolveConcepto) return 0;
      return toNumber(context.resolveConcepto(node.id));
    }

    case 'NEG': return -toNumber(evalNode(node.operand, context, engineConfig));
    case 'NOT': return !toBoolean(evalNode(node.operand, context, engineConfig));

    case 'AND': return toBoolean(evalNode(node.left, context, engineConfig)) && toBoolean(evalNode(node.right, context, engineConfig));
    case 'OR': return toBoolean(evalNode(node.left, context, engineConfig)) || toBoolean(evalNode(node.right, context, engineConfig));

    case 'COMPARE': return compare(node.op, evalNode(node.left, context, engineConfig), evalNode(node.right, context, engineConfig));

    case 'BINOP': {
      const a = evalNode(node.left, context, engineConfig);
      const b = evalNode(node.right, context, engineConfig);
      switch (node.op) {
        // "+" concatena si algún lado no es numérico (ej. las fórmulas de
        // leyenda de cnt_modelo_asiento: PERIODO+" Venta N° "+COMPROBANTE).
        case '+': return (typeof a === 'string' || typeof b === 'string')
          ? toDisplayString(a) + toDisplayString(b)
          : toNumber(a) + toNumber(b);
        case '-': return toNumber(a) - toNumber(b);
        case '*': return toNumber(a) * toNumber(b);
        case '/': return toNumber(b) === 0 ? 0 : toNumber(a) / toNumber(b);
        default: throw new FormulaSyntaxError(`Operador desconocido: ${node.op}`);
      }
    }

    case 'IF':
      return toBoolean(evalNode(node.cond, context, engineConfig))
        ? evalNode(node.then, context, engineConfig)
        : evalNode(node.else, context, engineConfig);

    case 'CALL': {
      const funcDef = engineConfig.functions[node.name];
      if (!funcDef) throw new UnsupportedFormulaError(node.name);
      // Args 'ident' ya llegan como nodos STRING (ver parseIdentArgs) — no
      // hace falta re-evaluarlos, son etiquetas fijas, no expresiones.
      const args = node.args.map(a => a.type === 'STRING' ? a.value : evalNode(a, context, engineConfig));
      return funcDef.apply(args, context);
    }

    default: throw new FormulaSyntaxError(`Nodo de AST desconocido: ${node.type}`);
  }
}

// context = { variables: { UNIDAD, IMPORTE, SUELDO, ... }, resolveConcepto: (id) => number }
// engineConfig = { variables: Set<string>, functions: {NOMBRE: {apply(args,context), mode?}}, aliases?: {} }
// Sin tercer argumento evalúa con el vocabulario de Sueldos (compatibilidad histórica).
function evaluateFormula(expression, context = {}, engineConfig = SUELDOS_ENGINE) {
  if (expression === null || expression === undefined) return null;
  const trimmed = String(expression).trim();
  if (trimmed === '') return null;
  const ast = parse(trimmed, engineConfig);
  return evalNode(ast, context, engineConfig);
}

module.exports = {
  evaluateFormula,
  FormulaSyntaxError,
  UnsupportedFormulaError,
  KNOWN_VARIABLES,
  KNOWN_FUNCTIONS,
};
