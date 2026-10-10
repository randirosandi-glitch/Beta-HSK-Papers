import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../src/core/progress-persistence.js'), 'utf8');

function makeContext(initial = {}, routeOverrides = {}) {
  let store = initial;
  let clock = 1000;
  let syncCount = 0;
  const context = vm.createContext({
    answers: { '1': 'A' },
    checked: { '1': true },
    answerEvents: { '1': 'event-1' },
    resumeQuestionId: '1',
    currentUsername: 'randi',
    route: { screen: 'exercise', packageCode: 'H51001', type: 'reading', sectionIndex: 0, ...routeOverrides },
    window: { __hskResumePage: 2 },
    readStore: () => store,
    writeStore: value => { store = value; },
    scheduleCloudSync: () => { syncCount++; },
    stateKey: (code, type, idx) => code + '|' + type + '|' + idx,
    Date: { now: () => ++clock }
  });
  new vm.Script(source + '\nthis.saveSectionState=saveSectionState; this.clearSectionState=clearSectionState;').runInContext(context);
  return { context, getStore: () => store, syncCount: () => syncCount };
}

test('saving a section preserves schema and clears covered progress-reset tombstones', () => {
  const { context, getStore, syncCount } = makeContext({
    _progressResets: {
      'H51001|reading|0': 100,
      '_resume': 100,
      'package:H51001': 100,
      'section:H51001|reading': 100
    },
    'H51001|reading|0': { answers: { 'old': 'B' }, checked: {}, answerEvents: { old: 'old-event' }, updatedAt: 10 }
  });
  context.saveSectionState('H51001', 'reading', 0);
  const store = getStore();
  assert.deepEqual(JSON.parse(JSON.stringify(store['H51001|reading|0'].answers)), { '1': 'A' });
  assert.deepEqual(JSON.parse(JSON.stringify(store['H51001|reading|0'].checked)), { '1': true });
  assert.deepEqual(JSON.parse(JSON.stringify(store['H51001|reading|0'].answerEvents)), { 'old': 'old-event', '1': 'event-1' });
  assert.equal(store._progressResets, undefined);
  assert.equal(store._resume.code, 'H51001');
  assert.equal(store._resume.page, 2);
  assert.equal(store._resume.questionId, '1');
  assert.equal(syncCount(), 1);
});

test('saving a non-active section does not overwrite resume position', () => {
  const existingResume = { code: 'OTHER', type: 'listening', sectionIndex: 2, questionId: '42', page: 4, updatedAt: 5 };
  const { context, getStore } = makeContext({ _resume: existingResume }, { packageCode: 'H51001' });
  context.saveSectionState('H51001', 'reading', 1);
  assert.deepEqual(JSON.parse(JSON.stringify(getStore()._resume)), existingResume);
});

test('clearing a section removes only its own progress and matching resume route', () => {
  const { context, getStore, syncCount } = makeContext({
    'H51001|reading|0': { answers: { '1': 'A' } },
    'H51001|reading|1': { answers: { '2': 'B' } },
    _resume: { code: 'H51001', type: 'reading', sectionIndex: 0 }
  });
  context.clearSectionState('H51001', 'reading', 0);
  const store = getStore();
  assert.equal(store['H51001|reading|0'], undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(store['H51001|reading|1'])), { answers: { '2': 'B' } });
  assert.equal(store._resume, undefined);
  assert.equal(syncCount(), 1);
});

test('clearing another section preserves the active resume route', () => {
  const resume = { code: 'H51001', type: 'reading', sectionIndex: 0 };
  const { context, getStore } = makeContext({
    'H51001|reading|1': { answers: { '2': 'B' } },
    _resume: resume
  });
  context.clearSectionState('H51001', 'reading', 1);
  assert.deepEqual(JSON.parse(JSON.stringify(getStore()._resume)), resume);
});

test('saving with an explicit answer-event map persists the supplied event IDs', () => {
  const { context, getStore } = makeContext({ 'H51001|reading|0': { answers: {}, checked: {}, answerEvents: {} } });
  context.saveSectionState('H51001', 'reading', 0, { '1': 'A' }, { '1': false }, { '1': 'event-1' });
  assert.deepEqual(JSON.parse(JSON.stringify(getStore()['H51001|reading|0'].answerEvents)), { '1': 'event-1' });
});
