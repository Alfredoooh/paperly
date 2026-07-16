// lib/sheet-store.js
//
// Persistência e motor de recálculo do Nexa Sheets. Guarda em
// localStorage sob o prefixo "sheets_". Cada documento tem uma
// grelha esparsa (só células não-vazias são guardadas) mais
// metadados de formatação por célula.

import {
  evaluateFormula,
  extractDependencies,
  cellId,
  parseCellId,
  FormulaError,
} from './formula-engine.js';

export const STORAGE_PREFIX = 'sheets_';
const INDEX_KEY = STORAGE_PREFIX + 'index';

export const DEFAULT_ROWS = 60;
export const DEFAULT_COLS = 26; // A..Z

// ── Estrutura de um documento em memória ────────────────────────
//
// {
//   id, name, rows, cols,
//   cells: { "A1": { raw: "=B1+B2", format: "decimal2", bold: true, italic: false,
//                     align: "right", color: "", fill: "" } },
//   colWidths: { "0": 96 },
// }

export function loadIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveIndex(index) {
  try { localStorage.setItem(INDEX_KEY, JSON.stringify(index)); } catch (e) {}
}

function touchIndex(id, name) {
  const index = loadIndex();
  const existing = index.find((d) => d.id === id);
  const updatedAt = Date.now();
  if (existing) {
    existing.name = name;
    existing.updatedAt = updatedAt;
  } else {
    index.push({ id, name, updatedAt });
  }
  saveIndex(index);
}

export function loadDocument(id) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      id,
      name: parsed.name || 'Nova folha',
      rows: parsed.rows || DEFAULT_ROWS,
      cols: parsed.cols || DEFAULT_COLS,
      cells: parsed.cells || {},
      colWidths: parsed.colWidths || {},
    };
  } catch (e) {
    return null;
  }
}

export function createDocument(id) {
  return {
    id,
    name: 'Nova folha',
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    cells: {},
    colWidths: {},
  };
}

export function persistDocument(doc) {
  const payload = {
    name: doc.name,
    rows: doc.rows,
    cols: doc.cols,
    cells: doc.cells,
    colWidths: doc.colWidths,
    updatedAt: Date.now(),
  };
  localStorage.setItem(STORAGE_PREFIX + doc.id, JSON.stringify(payload));
  touchIndex(doc.id, doc.name);
}

export function deleteDocument(id) {
  try { localStorage.removeItem(STORAGE_PREFIX + id); } catch (e) {}
  const index = loadIndex();
  saveIndex(index.filter((d) => d.id !== id));
}

export function duplicateDocument(id) {
  const doc = loadDocument(id);
  if (!doc) return null;
  const newId = 'sheet_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const copy = {
    ...doc,
    id: newId,
    name: doc.name + ' (cópia)',
    cells: JSON.parse(JSON.stringify(doc.cells)),
    colWidths: { ...doc.colWidths },
  };
  persistDocument(copy);
  return copy;
}

// ── Recálculo em cascata com deteção de ciclos ──────────────────
//
// Usa DFS com uma pilha explícita de recursão (`stack`). Quando uma
// célula ainda "visiting" é revisitada, TODOS os nós que estão na
// pilha desde essa posição até ao topo fazem parte do ciclo e são
// marcados como '#CIRC!' — não apenas o ponto de reentrada. Isto
// garante que numa cadeia A1->B1->C1->A1, as três células ficam
// corretamente assinaladas, e que uma célula D1 que apenas *lê* uma
// célula circular (sem participar do ciclo) recebe 0 nessa leitura
// mas continua a calcular o resto normalmente, sem ela própria ficar
// marcada como circular.

/**
 * Recalcula os valores derivados de todas as fórmulas do documento.
 * Devolve { values, errors } onde:
 *   values[addr] -> valor final resolvido (number | string | FormulaError)
 *   errors[addr] -> código de erro se aplicável
 */
export function recomputeAll(doc) {
  const values = {};
  const errors = {};
  const state = {}; // addr -> 'visiting' | 'done'
  const stack = []; // pilha de addrs em recursão ativa, por ordem de entrada
  
  function rawOf(addr) {
    const cell = doc.cells[addr];
    if (!cell || cell.raw === undefined || cell.raw === null) return '';
    return cell.raw;
  }
  
  function markCycle(fromAddr) {
    const idx = stack.indexOf(fromAddr);
    const cycleNodes = idx >= 0 ? stack.slice(idx) : [fromAddr];
    for (const node of cycleNodes) {
      errors[node] = '#CIRC!';
      values[node] = new FormulaError('#CIRC!');
    }
  }
  
  function resolve(addr) {
    if (state[addr] === 'done') return values[addr];
    if (state[addr] === 'visiting') {
      markCycle(addr);
      return values[addr];
    }
    state[addr] = 'visiting';
    stack.push(addr);
    
    const raw = rawOf(addr);
    if (typeof raw === 'string' && raw.startsWith('=')) {
      try {
        const deps = extractDependencies(raw);
        for (const dep of deps) {
          if (!parseCellId(dep)) continue;
          resolve(dep);
        }
        // Se esta célula já foi marcada como parte de um ciclo durante
        // a resolução das suas dependências, não deixamos o resultado
        // "normal" da fórmula sobrepor-se a essa marca.
        if (errors[addr] !== '#CIRC!') {
          const result = evaluateFormula(raw, {
            getCellValue: (a) => {
              const v = a === addr ? values[addr] : resolve(a);
              return v instanceof FormulaError ? '' : v;
            },
          });
          values[addr] = result;
        }
      } catch (e) {
        if (errors[addr] !== '#CIRC!') {
          const code = e instanceof FormulaError ? e.code : '#ERROR!';
          errors[addr] = code;
          values[addr] = new FormulaError(code);
        }
      }
    } else {
      values[addr] = raw;
    }
    
    stack.pop();
    state[addr] = 'done';
    return values[addr];
  }
  
  for (const addr of Object.keys(doc.cells)) {
    resolve(addr);
  }
  
  return { values, errors };
}

// ── Exportação CSV (sem AndroidStorage — download direto do browser) ──

function csvEscape(value) {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function documentToCsv(doc, resolvedValues) {
  const lines = [];
  for (let r = 0; r < doc.rows; r++) {
    const rowVals = [];
    let hasAny = false;
    for (let c = 0; c < doc.cols; c++) {
      const addr = cellId(r, c);
      const val = resolvedValues[addr];
      if (val !== undefined && val !== '' && !(val instanceof FormulaError)) hasAny = true;
      rowVals.push(csvEscape(val instanceof FormulaError ? val.code : val));
    }
    if (hasAny || lines.length > 0) lines.push(rowVals.join(','));
  }
  while (lines.length > 0 && lines[lines.length - 1].split(',').every((c) => c === '')) {
    lines.pop();
  }
  return lines.join('\r\n');
}

export function downloadCsv(doc, resolvedValues) {
  const csv = documentToCsv(doc, resolvedValues);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (doc.name || 'folha').replace(/[\\/:*?"<>|]+/g, '_') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export { cellId, parseCellId };