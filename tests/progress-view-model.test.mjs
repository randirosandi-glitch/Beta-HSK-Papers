import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const statsSource = await readFile(resolve(here, '../src/core/progress-stats.js'), 'utf8');
const historySource = await readFile(resolve(here, '../src/core/progress-history.js'), 'utf8');

function statsContext(store = {}) {
  const DB = {
    PKG: {
      listening: [{ title: 'Listening · Part 1', range: '1–2', questions: [['1'], ['2']] }],
      reading: [{ title: 'Reading · Part 1', range: '3–4', questions: [['3'], ['4']] }],
      writing: [{ title: 'Writing · Part 1', range: '5–6', questions: [['5'], ['6']] }]
    },
    LAZY: { __lazy: true }
  };
  const context = vm.createContext({
    DB,
    META: {
      listening: { label: 'Listening', zh: '听力' },
      reading: { label: 'Reading', zh: '阅读' },
      writing: { label: 'Writing', zh: '写作' }
    },
    readStore: () => store,
    isCorrect: (_q, answer) => String(answer) === 'A',
    isSequenceWriting: (_type, idx) => Number(idx) === 0,
    window: { __hskDatabase: { byCode: new Map([['LAZY', { path: 'catalog/HSK 5/H51001.json' }]]) } }
  });
  new vm.Script(statsSource +
    '\nthis.stateKey=stateKey; this.getSectionState=getSectionState; this.sectionStats=sectionStats; this.packageStats=packageStats; this.lazyStoredProgress=lazyStoredProgress;').runInContext(context);
  return context;
}

test('section progress counts only nonblank answers and scores through the existing scorer', () => {
  const context = statsContext({
    'PKG|reading|0': { answers: { '3': 'A', '4': '  ' }, checked: {}, answerEvents: {} }
  });
  const result = context.sectionStats('PKG', 'reading', 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { answered: 1, total: 2, pct: 50, score: 1 });
});

test('package progress aggregates listening, reading, and writing with existing grading rules', () => {
  const context = statsContext({
    'PKG|listening|0': { answers: { '1': 'A' }, updatedAt: 10 },
    'PKG|reading|0': { answers: { '3': 'B', '4': 'A' }, updatedAt: 20 },
    'PKG|writing|0': { answers: { '5': 'A' }, updatedAt: 30 }
  });
  const result = context.packageStats('PKG');
  assert.equal(result.total, 6);
  assert.equal(result.answered, 4);
  assert.equal(result.pct, 67);
  assert.equal(result.gradedTotal, 6);
  assert.equal(result.score, 3);
  assert.equal(result.scorePct, 50);
  assert.equal(result.rows.length, 3);
});

test('lazy package progress uses metadata total and caps the displayed answer count', () => {
  const store = { 'LAZY|reading|0': { answers: Object.fromEntries(Array.from({ length: 125 }, (_, i) => [String(i), 'A'])) } };
  const context = statsContext(store);
  const result = context.packageStats('LAZY');
  assert.equal(result.total, 100);
  assert.equal(result.answered, 100);
  assert.equal(result.pct, 100);
  assert.equal(result.rows.length, 0);
});

function historyContext(store, DB, statsByCode) {
  const context = vm.createContext({
    readStore: () => store,
    DB,
    META: { listening: { label: 'Listening' }, reading: { label: 'Reading' }, writing: { label: 'Writing' } },
    packageStats: code => statsByCode[code] || { answered: 0, total: 10, pct: 0 },
    stateKey: (code, type, idx) => code + '|' + type + '|' + idx
  });
  new vm.Script(historySource +
    '\nthis.getProgressHistory=getProgressHistory; this.getLastProgress=getLastProgress;').runInContext(context);
  return context;
}

test('recent history prioritizes authoritative last activity and sorts remaining packages by recency', () => {
  const DB = {
    A: { title: 'Paket A', reading: [{ questions: [] }] },
    B: { title: 'Paket B', listening: [{ questions: [] }] },
    C: { title: 'Paket C', reading: [{ questions: [] }] }
  };
  const store = {
    _lastActivity: { code: 'B', type: 'listening', sectionIndex: 0, updatedAt: 300 },
    _attempts: [{ id: 'a1', code: 'A', timestamp: 200, updatedAt: 200 }],
    'A|reading|0': { updatedAt: 200 }
  };
  const context = historyContext(store, DB, {
    A: { answered: 1, total: 10, pct: 10 },
    B: { answered: 1, total: 10, pct: 10 },
    C: { answered: 0, total: 10, pct: 0 }
  });
  const items = JSON.parse(JSON.stringify(context.getProgressHistory(3)));
  assert.deepEqual(items.map(x => x.code), ['B', 'A']);
  assert.equal(items[0].latest, 300);
  assert.equal(items[1].latest, 200);
});

test('history limit defaults to three and clamps invalid limits to at least one', () => {
  const DB = {};
  for (const code of ['A', 'B', 'C', 'D']) DB[code] = { reading: [{ questions: [] }] };
  const store = {
    _attempts: ['A', 'B', 'C', 'D'].map((code, i) => ({ id: code, code, timestamp: (i + 1) * 100, updatedAt: (i + 1) * 100 }))
  };
  const stats = Object.fromEntries(['A', 'B', 'C', 'D'].map(code => [code, { answered: 1, total: 10, pct: 10 }]));
  const context = historyContext(store, DB, stats);
  assert.equal(context.getProgressHistory().length, 3);
  assert.equal(context.getProgressHistory(0).length, 3);
  assert.equal(context.getLastProgress().code, 'D');
});
