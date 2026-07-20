// lib/sheet-store.js
//
// Persistência e motor de recálculo do Nexa Sheets. Guarda em
// localStorage sob o prefixo "sheets_". Cada documento tem uma ou
// mais folhas (abas); cada folha tem a sua própria grelha esparsa
// (só células não-vazias são guardadas) mais metadados de
// formatação por célula.

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
export const MAX_SHEETS = 40;

// ── Estrutura de um documento em memória ────────────────────────
//
// {
//   id, name, activeSheetId,
//   sheets: [
//     { id, name, rows, cols,
//       cells: { "A1": { raw: "=B1+B2", format: "decimal2", bold: true, italic: false,
//                         align: "right", color: "", fill: "" } },
//       colWidths: { "0": 96 } },
//     ...
//   ],
// }

// Gera um UUID v4 real (mesmo formato que o router.js e o resto do
// ecossistema Nexa esperam: 8-4-4-4-12 hex). IMPORTANTE: este ID é o
// que vai parar na URL como /sheets/{id}/, por isso TEM de bater no
// UUID_REGEX de shared/router.js — caso contrário o router trata a
// rota como desconhecida (notFound) e o utilizador vê o app a
// "criar" ID atrás de ID sempre que navega. `crypto.randomUUID()`
// existe em todos os browsers/WebViews modernos (Chrome 92+, Safari
// 15.4+); o fallback manual cobre WebViews Android mais antigos onde
// a API pode faltar.
function newUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ID interno de ABA (tab) dentro de um documento — este NUNCA vai
// para a URL (só doc.id vai), por isso mantém-se no formato curto
// original 'tab_xxxxx'. Não mexer aqui evita invalidar abas já
// guardadas no localStorage de utilizadores existentes.
function newSheetId() {
  return 'tab_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function createSheet(name) {
  return {
    id: newSheetId(),
    name: name || 'Folha1',
    rows: DEFAULT_ROWS,
    cols: DEFAULT_COLS,
    cells: {},
    colWidths: {},
  };
}

function nextSheetName(existingSheets) {
  const used = new Set(existingSheets.map((s) => s.name));
  let n = existingSheets.length + 1;
  let candidate = `Folha${n}`;
  while (used.has(candidate)) {
    n++;
    candidate = `Folha${n}`;
  }
  return candidate;
}

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

// Migra um documento no formato ANTIGO (rows/cols/cells/colWidths na
// raiz, sem conceito de abas) para o formato novo com `sheets`. Um
// documento já-migrado (tem `sheets` array) passa direto sem
// alteração. Isto garante que folhas criadas antes desta versão
// continuam a abrir normalmente, como "Folha1" única.
function migrateToSheets(parsed, id) {
  if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
    return {
      id,
      name: parsed.name || 'Nova pasta de cálculo',
      activeSheetId: parsed.activeSheetId && parsed.sheets.some((s) => s.id === parsed.activeSheetId)
        ? parsed.activeSheetId
        : parsed.sheets[0].id,
      sheets: parsed.sheets.map((s) => ({
        id: s.id || newSheetId(),
        name: s.name || 'Folha1',
        rows: s.rows || DEFAULT_ROWS,
        cols: s.cols || DEFAULT_COLS,
        cells: s.cells || {},
        colWidths: s.colWidths || {},
      })),
    };
  }
  // formato antigo: rows/cols/cells/colWidths estavam na raiz
  const legacySheet = {
    id: newSheetId(),
    name: 'Folha1',
    rows: parsed.rows || DEFAULT_ROWS,
    cols: parsed.cols || DEFAULT_COLS,
    cells: parsed.cells || {},
    colWidths: parsed.colWidths || {},
  };
  return {
    id,
    name: parsed.name || 'Nova pasta de cálculo',
    activeSheetId: legacySheet.id,
    sheets: [legacySheet],
  };
}

export function loadDocument(id) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrateToSheets(parsed, id);
  } catch (e) {
    return null;
  }
}

export function createDocument(id) {
  const sheet = createSheet('Folha1');
  return {
    id,
    name: 'Nova pasta de cálculo',
    activeSheetId: sheet.id,
    sheets: [sheet],
  };
}

export function persistDocument(doc) {
  const payload = {
    name: doc.name,
    activeSheetId: doc.activeSheetId,
    sheets: doc.sheets,
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
  const newId = newUuid();
  const copy = {
    ...doc,
    id: newId,
    name: doc.name + ' (cópia)',
    sheets: doc.sheets.map((s) => ({
      ...s,
      cells: JSON.parse(JSON.stringify(s.cells)),
      colWidths: { ...s.colWidths },
    })),
  };
  persistDocument(copy);
  return copy;
}

// ── Gestão de abas (folhas) dentro de um documento ──────────────
//
// Todas as funções abaixo devolvem um NOVO objeto `doc` (imutável em
// relação ao que recebem), para o chamador simplesmente fazer
// `doc = addSheet(doc)` e disparar a reatividade do Svelte.

export function getActiveSheet(doc) {
  return doc.sheets.find((s) => s.id === doc.activeSheetId) || doc.sheets[0];
}

export function addSheet(doc) {
  if (doc.sheets.length >= MAX_SHEETS) return doc;
  const sheet = createSheet(nextSheetName(doc.sheets));
  return {
    ...doc,
    sheets: [...doc.sheets, sheet],
    activeSheetId: sheet.id,
  };
}

export function removeSheet(doc, sheetId) {
  if (doc.sheets.length <= 1) return doc; // nunca fica sem nenhuma aba
  const idx = doc.sheets.findIndex((s) => s.id === sheetId);
  if (idx === -1) return doc;
  const nextSheets = doc.sheets.filter((s) => s.id !== sheetId);
  let nextActiveId = doc.activeSheetId;
  if (nextActiveId === sheetId) {
    // ativa a aba vizinha (a anterior, ou a primeira se apagou a primeira)
    const fallback = nextSheets[Math.min(idx, nextSheets.length - 1)];
    nextActiveId = fallback.id;
  }
  return { ...doc, sheets: nextSheets, activeSheetId: nextActiveId };
}

export function renameSheet(doc, sheetId, newName) {
  const trimmed = (newName || '').trim();
  if (!trimmed) return doc;
  return {
    ...doc,
    sheets: doc.sheets.map((s) => (s.id === sheetId ? { ...s, name: trimmed } : s)),
  };
}

export function duplicateSheet(doc, sheetId) {
  if (doc.sheets.length >= MAX_SHEETS) return doc;
  const original = doc.sheets.find((s) => s.id === sheetId);
  if (!original) return doc;
  const copy = {
    ...original,
    id: newSheetId(),
    name: nextSheetName(doc.sheets.concat([{ name: original.name + ' (cópia)' }])) === `Folha${doc.sheets.length + 1}`
      ? original.name + ' (cópia)'
      : original.name + ' (cópia)',
    cells: JSON.parse(JSON.stringify(original.cells)),
    colWidths: { ...original.colWidths },
  };
  const idx = doc.sheets.findIndex((s) => s.id === sheetId);
  const nextSheets = [...doc.sheets.slice(0, idx + 1), copy, ...doc.sheets.slice(idx + 1)];
  return { ...doc, sheets: nextSheets, activeSheetId: copy.id };
}

export function setActiveSheet(doc, sheetId) {
  if (!doc.sheets.some((s) => s.id === sheetId)) return doc;
  return { ...doc, activeSheetId: sheetId };
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
//
// IMPORTANTE (abas): fórmulas SÓ podem referenciar células da MESMA
// folha — não há sintaxe "NomeFolha!A1" nesta versão. Por isso
// recomputeAll continua a operar sobre UMA folha de cada vez (a
// ativa); cada aba tem o seu próprio grafo de dependências isolado.

/**
 * Recalcula os valores derivados de todas as fórmulas de UMA folha.
 * Devolve { values, errors } onde:
 *   values[addr] -> valor final resolvido (number | string | boolean | FormulaError)
 *   errors[addr] -> código de erro se aplicável
 */
export function recomputeSheet(sheet) {
  const values = {};
  const errors = {};
  const state = {}; // addr -> 'visiting' | 'done'
  const stack = []; // pilha de addrs em recursão ativa, por ordem de entrada
  
  function rawOf(addr) {
    const cell = sheet.cells[addr];
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
  
  for (const addr of Object.keys(sheet.cells)) {
    resolve(addr);
  }
  
  return { values, errors };
}

/**
 * Recalcula APENAS a folha ativa do documento (mantém o nome
 * `recomputeAll` por compatibilidade — o "all" refere-se a todas as
 * células da folha ativa, tal como antes das abas existirem).
 */
export function recomputeAll(doc) {
  const sheet = getActiveSheet(doc);
  return recomputeSheet(sheet);
}

// ── Exportação CSV (sem AndroidStorage — download direto do browser) ──
//
// Exporta sempre a folha ATIVA — exportar todas as abas de uma vez
// exigiria escolher entre um .zip de vários .csv ou achatar tudo
// num único ficheiro, o que não é o comportamento que o utilizador
// esperaria de "Exportar CSV" a partir do menu de uma folha.

function csvEscape(value) {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function sheetToCsv(sheet, resolvedValues) {
  const lines = [];
  for (let r = 0; r < sheet.rows; r++) {
    const rowVals = [];
    let hasAny = false;
    for (let c = 0; c < sheet.cols; c++) {
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

// Mantido por compatibilidade de nome com chamadas existentes —
// `doc` aqui é, na prática, a folha ativa (ver downloadCsv abaixo).
export const documentToCsv = sheetToCsv;

export function downloadCsv(doc, resolvedValues) {
  const sheet = getActiveSheet(doc);
  const csv = sheetToCsv(sheet, resolvedValues);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileBase = (doc.sheets.length > 1 ? `${doc.name}_${sheet.name}` : doc.name) || 'folha';
  a.download = fileBase.replace(/[\\/:*?"<>|]+/g, '_') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export { cellId, parseCellId };