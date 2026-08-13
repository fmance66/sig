// Evaluador acotado del DSL de fórmulas de sld_concepto (formula_unidad, formula_importe,
// formula_unitario, formula_condicion) y de sld_formula_auxiliar.
//
// Cubre: aritmética (+ - * /), comparaciones (> < >= <= = <>), lógicos (AND OR NOT),
// IF(cond, then, else) anidable, paréntesis, funciones ROUND/INTEGER/ABS/MAX/MIN/MONTH,
// referencias a conceptos del mismo recibo (#id / Gid) y variables de contexto fijas.
//
// NO cubre (se detecta en el parseo y se levanta UnsupportedFormulaError, sin crashear el
// resto del recibo): RECIBOS(), CONCEPTOS(), FAMILIARES(), NOVEDADES(), TABLA(),
// ACUMULADO_GANANCIA(), RETENCION_FIJA/PORCENTAJE(), ADDDAY(), macros de sld_formula_auxiliar,
// y cualquier variable/función no listada en KNOWN_VARIABLES / KNOWN_FUNCTIONS.

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

const KNOWN_VARIABLES = new Set([
  'UNIDAD', 'IMPORTE', 'UNIDAD_MANUAL', 'IMPORTE_MANUAL',
  'SUELDO', 'ADICIONAL', 'DIAS', 'HORAS', 'HORAS_CONVENIO',
  'ANTIGUEDAD', 'ANTIGUEDAD_MESES', 'ANTIGUEDAD_DIAS',
  'NUMERO_RECIBO', 'FECHA', 'FECHA_DESDE', 'FECHA_HASTA',
  'EMPLEADO_JORNAL',
  'TOTAL_REMUNERATIVO', 'TOTAL_NO_REMUNERATIVO', 'TOTAL_DESCUENTO', 'TOTAL_CONTRIBUCION',
  'SUELDO_BRUTO', 'SUELDO_NETO',
]);

const KNOWN_FUNCTIONS = new Set(['ROUND', 'INTEGER', 'ABS', 'MAX', 'MIN', 'MONTH']);

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

    throw new FormulaSyntaxError(`Carácter inesperado '${c}' en posición ${i}`);
  }

  tokens.push({ type: 'EOF' });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser (recursive descent) -> AST
// ---------------------------------------------------------------------------

function parse(source) {
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

  function parsePrimary() {
    const tok = peek();

    if (tok.type === 'NUMBER') { advance(); return { type: 'NUMBER', value: tok.value }; }
    if (tok.type === 'BOOLEAN') { advance(); return { type: 'BOOLEAN', value: tok.value }; }
    if (tok.type === 'STRING') { advance(); return { type: 'STRING', value: tok.value }; }
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
        if (!KNOWN_FUNCTIONS.has(name)) throw new UnsupportedFormulaError(name);
        const args = parseArgs();
        return { type: 'CALL', name, args };
      }
      if (!KNOWN_VARIABLES.has(name)) throw new UnsupportedFormulaError(name);
      return { type: 'VARIABLE', name };
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

function evalNode(node, context) {
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

    case 'NEG': return -toNumber(evalNode(node.operand, context));
    case 'NOT': return !toBoolean(evalNode(node.operand, context));

    case 'AND': return toBoolean(evalNode(node.left, context)) && toBoolean(evalNode(node.right, context));
    case 'OR': return toBoolean(evalNode(node.left, context)) || toBoolean(evalNode(node.right, context));

    case 'COMPARE': return compare(node.op, evalNode(node.left, context), evalNode(node.right, context));

    case 'BINOP': {
      const a = toNumber(evalNode(node.left, context));
      const b = toNumber(evalNode(node.right, context));
      switch (node.op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? 0 : a / b;
        default: throw new FormulaSyntaxError(`Operador desconocido: ${node.op}`);
      }
    }

    case 'IF':
      return toBoolean(evalNode(node.cond, context))
        ? evalNode(node.then, context)
        : evalNode(node.else, context);

    case 'CALL': {
      const args = node.args.map(a => evalNode(a, context));
      switch (node.name) {
        case 'ROUND': {
          const decimals = args.length > 1 ? toNumber(args[1]) : 0;
          const factor = 10 ** decimals;
          return Math.round(toNumber(args[0]) * factor) / factor;
        }
        case 'INTEGER': return Math.trunc(toNumber(args[0]));
        case 'ABS': return Math.abs(toNumber(args[0]));
        case 'MAX': return Math.max(...args.map(toNumber));
        case 'MIN': return Math.min(...args.map(toNumber));
        case 'MONTH': {
          const v = args[0];
          const date = v instanceof Date ? v : new Date(v);
          return date.getMonth() + 1;
        }
        default: throw new UnsupportedFormulaError(node.name);
      }
    }

    default: throw new FormulaSyntaxError(`Nodo de AST desconocido: ${node.type}`);
  }
}

// context = { variables: { UNIDAD, IMPORTE, SUELDO, ... }, resolveConcepto: (id) => number }
function evaluateFormula(expression, context = {}) {
  if (expression === null || expression === undefined) return null;
  const trimmed = String(expression).trim();
  if (trimmed === '') return null;
  const ast = parse(trimmed);
  return evalNode(ast, context);
}

module.exports = {
  evaluateFormula,
  FormulaSyntaxError,
  UnsupportedFormulaError,
  KNOWN_VARIABLES,
  KNOWN_FUNCTIONS,
};
