// lib/formula-engine.js
//
// Motor de fórmulas para o Nexa Sheets. Sem dependências externas.
// Suporta: referências de célula (A1), ranges (A1:B5), operadores
// + - * / ^, parênteses, negativos unários, e as funções SUM,
// AVERAGE, MIN, MAX, COUNT. Deteta referências circulares (a
// deteção em si vive em sheet-store.js:recomputeAll).

// ── Conversão entre coordenadas e endereços tipo "A1" ──────────────

export function colIndexToLetters(index) {
  // 0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, ...
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function lettersToColIndex(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function cellId(row, col) {
  return `${colIndexToLetters(col)}${row + 1}`;
}

export function parseCellId(id) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(id.trim());
  if (!m) return null;
  const col = lettersToColIndex(m[1].toUpperCase());
  const row = parseInt(m[2], 10) - 1;
  if (row < 0) return null;
  return { row, col };
}

// ── Tokenizer ────────────────────────────────────────────────────

const TOKEN_RE = /\s*(?:([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(\d+\.?\d*)|("(?:[^"\\]|\\.)*")|([()+\-*/^,])|(.))/g;

function tokenize(expr) {
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  let match;
  while ((match = TOKEN_RE.exec(expr)) !== null) {
    const [, ref, ident, num, str, sym, unknown] = match;
    if (ref) tokens.push({ type: 'ref', value: ref.toUpperCase() });
    else if (ident) tokens.push({ type: 'ident', value: ident.toUpperCase() });
    else if (num !== undefined) tokens.push({ type: 'num', value: parseFloat(num) });
    else if (str !== undefined) tokens.push({ type: 'str', value: str.slice(1, -1).replace(/\\"/g, '"') });
    else if (sym) tokens.push({ type: 'sym', value: sym });
    else if (unknown && unknown.trim() !== '') tokens.push({ type: 'unknown', value: unknown });
    if (TOKEN_RE.lastIndex === match.index) TOKEN_RE.lastIndex++; // guarda contra loop infinito
  }
  return tokens;
}

// ── Parser (recursive descent) — produz uma AST ─────────────────
//
// Gramática:
//   expr    := term (('+' | '-') term)*
//   term    := power (('*' | '/') power)*
//   power   := unary ('^' unary)*
//   unary   := ('-' | '+')? primary
//   primary := NUM | STR | REF | RANGE | IDENT '(' args ')' | '(' expr ')'
//   args    := expr (',' expr)*

class ParseError extends Error {}

function parseExpression(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function next() { return tokens[pos++]; }
  function expectSym(s) {
    const t = next();
    if (!t || t.type !== 'sym' || t.value !== s) {
      throw new ParseError(`Esperava "${s}"`);
    }
  }

  function parseExpr() {
    let node = parseTerm();
    while (peek() && peek().type === 'sym' && (peek().value === '+' || peek().value === '-')) {
      const op = next().value;
      const right = parseTerm();
      node = { type: 'binop', op, left: node, right };
    }
    return node;
  }

  function parseTerm() {
    let node = parsePower();
    while (peek() && peek().type === 'sym' && (peek().value === '*' || peek().value === '/')) {
      const op = next().value;
      const right = parsePower();
      node = { type: 'binop', op, left: node, right };
    }
    return node;
  }

  function parsePower() {
    let node = parseUnary();
    while (peek() && peek().type === 'sym' && peek().value === '^') {
      next();
      const right = parseUnary();
      node = { type: 'binop', op: '^', left: node, right };
    }
    return node;
  }

  function parseUnary() {
    if (peek() && peek().type === 'sym' && (peek().value === '-' || peek().value === '+')) {
      const op = next().value;
      const operand = parseUnary();
      return { type: 'unary', op, operand };
    }
    return parsePrimary();
  }

  function parseArgs() {
    const args = [];
    if (peek() && peek().type === 'sym' && peek().value === ')') return args;
    args.push(parseExpr());
    while (peek() && peek().type === 'sym' && peek().value === ',') {
      next();
      args.push(parseExpr());
    }
    return args;
  }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new ParseError('Expressão incompleta');

    if (t.type === 'num') { next(); return { type: 'num', value: t.value }; }
    if (t.type === 'str') { next(); return { type: 'str', value: t.value }; }

    if (t.type === 'ref') {
      next();
      if (t.value.includes(':')) {
        const [a, b] = t.value.split(':');
        return { type: 'range', from: a, to: b };
      }
      return { type: 'ref', addr: t.value };
    }

    if (t.type === 'ident') {
      next();
      if (peek() && peek().type === 'sym' && peek().value === '(') {
        next();
        const args = parseArgs();
        expectSym(')');
        return { type: 'call', name: t.value, args };
      }
      throw new ParseError(`Identificador desconhecido: ${t.value}`);
    }

    if (t.type === 'sym' && t.value === '(') {
      next();
      const node = parseExpr();
      expectSym(')');
      return node;
    }

    throw new ParseError(`Token inesperado: ${t.value}`);
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new ParseError('Caracteres extra no fim da fórmula');
  return result;
}

// ── Funções agregadoras ─────────────────────────────────────────

const FUNCTIONS = {
  SUM: (nums) => nums.reduce((a, b) => a + b, 0),
  AVERAGE: (nums) => (nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length),
  MIN: (nums) => (nums.length === 0 ? 0 : Math.min(...nums)),
  MAX: (nums) => (nums.length === 0 ? 0 : Math.max(...nums)),
  COUNT: (nums) => nums.length,
};

// ── Avaliador ────────────────────────────────────────────────────

export class FormulaError extends Error {
  constructor(code) {
    super(code);
    this.code = code; // '#REF!' | '#DIV/0!' | '#ERROR!' | '#CIRC!'
  }
}

function rangeAddresses(fromAddr, toAddr) {
  const from = parseCellId(fromAddr);
  const to = parseCellId(toAddr);
  if (!from || !to) throw new FormulaError('#REF!');
  const r0 = Math.min(from.row, to.row), r1 = Math.max(from.row, to.row);
  const c0 = Math.min(from.col, to.col), c1 = Math.max(from.col, to.col);
  const list = [];
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      list.push(cellId(r, c));
    }
  }
  return list;
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  if (v === '' || v === null || v === undefined) return 0;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function evaluateNode(node, ctx) {
  switch (node.type) {
    case 'num':
      return node.value;
    case 'str':
      return node.value;
    case 'ref': {
      const v = ctx.getCellValue(node.addr);
      return v;
    }
    case 'range': {
      const addrs = rangeAddresses(node.from, node.to);
      const nums = addrs.map((a) => toNumber(ctx.getCellValue(a)));
      return nums.reduce((a, b) => a + b, 0);
    }
    case 'unary': {
      const v = toNumber(evaluateNode(node.operand, ctx));
      return node.op === '-' ? -v : v;
    }
    case 'binop': {
      const l = toNumber(evaluateNode(node.left, ctx));
      const r = toNumber(evaluateNode(node.right, ctx));
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new FormulaError('#DIV/0!');
          return l / r;
        case '^': return Math.pow(l, r);
        default: throw new FormulaError('#ERROR!');
      }
    }
    case 'call': {
      const fn = FUNCTIONS[node.name];
      if (!fn) throw new FormulaError('#ERROR!');
      const nums = [];
      for (const arg of node.args) {
        if (arg.type === 'range') {
          const addrs = rangeAddresses(arg.from, arg.to);
          for (const a of addrs) {
            const v = ctx.getCellValue(a);
            if (v === '' || v === null || v === undefined) continue;
            nums.push(toNumber(v));
          }
        } else {
          const v = evaluateNode(arg, ctx);
          if (v === '' || v === null || v === undefined) continue;
          nums.push(toNumber(v));
        }
      }
      return fn(nums);
    }
    default:
      throw new FormulaError('#ERROR!');
  }
}

/**
 * Avalia uma fórmula (string começando por "="). Devolve o valor
 * resultante (number | string) ou lança FormulaError.
 *
 * ctx.getCellValue(addr) deve devolver o valor JÁ RESOLVIDO de outra
 * célula (o chamador é responsável por resolver dependências por
 * ordem e detetar circularidade antes de chegar aqui — ver
 * sheet-store.js:recomputeAll).
 */
export function evaluateFormula(formulaText, ctx) {
  const body = formulaText.trim().replace(/^=/, '');
  if (body === '') return '';
  let tokens;
  try {
    tokens = tokenize(body);
  } catch (e) {
    throw new FormulaError('#ERROR!');
  }
  if (tokens.some((t) => t.type === 'unknown')) throw new FormulaError('#ERROR!');
  let ast;
  try {
    ast = parseExpression(tokens);
  } catch (e) {
    throw new FormulaError('#ERROR!');
  }
  return evaluateNode(ast, ctx);
}

/**
 * Extrai a lista de endereços de célula (já expandidos, sem ranges)
 * de que uma fórmula depende. Usado para construir o grafo de
 * dependências antes de avaliar.
 */
export function extractDependencies(formulaText) {
  const body = formulaText.trim().replace(/^=/, '');
  if (body === '') return [];
  let tokens;
  try {
    tokens = tokenize(body);
  } catch (e) {
    return [];
  }
  const deps = new Set();
  for (const t of tokens) {
    if (t.type !== 'ref') continue;
    if (t.value.includes(':')) {
      const [a, b] = t.value.split(':');
      try {
        for (const addr of rangeAddresses(a, b)) deps.add(addr);
      } catch (e) { /* range inválido, ignora */ }
    } else {
      deps.add(t.value);
    }
  }
  return [...deps];
}

/** Formata um valor numérico para exibição, respeitando formato da célula. */
export function formatDisplayValue(value, format) {
  if (value instanceof FormulaError) return value.code;
  if (typeof value !== 'number') return value === undefined || value === null ? '' : String(value);

  switch (format) {
    case 'integer':
      return String(Math.round(value));
    case 'decimal2':
      return value.toFixed(2);
    case 'percent':
      return (value * 100).toFixed(1) + '%';
    case 'currency':
      return value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
    default:
      // "geral": inteiros sem casas, decimais até 4 casas sem zeros à direita
      if (Number.isInteger(value)) return String(value);
      return String(Math.round(value * 10000) / 10000);
  }
}