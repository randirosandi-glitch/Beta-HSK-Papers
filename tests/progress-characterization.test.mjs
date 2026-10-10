import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, '../index.html'), 'utf8');

function between(start, end) {
  const a = html.indexOf(start);
  assert.notEqual(a, -1, 'Missing source marker: ' + start);
  const b = html.indexOf(end, a);
  assert.notEqual(b, -1, 'Missing end marker: ' + end);
  return html.slice(a, b).trim();
}

const mergeSource = between('function mergeStoresLatest(local,remote){', '\nasync function pullCloudStateInternal');
const activitySource = between('function createQuestionActivity(questionId){', '\nfunction ensureQuestionActivity');
const updateSource = between('function updateQuestionActivity(eventId,correct){', '\nfunction ensureQuestionActivity');

function mergeContext() {
  const context = vm.createContext({
    progressResetAt: () => 0,
    resetCoversResume: () => 0,
    stateKey: (code, type, idx) => code + '|' + type + '|' + idx,
    mergePlanArrays: (local = [], remote = [], localDeleted = {}, remoteDeleted = {}) => ({
      out: Array.isArray(local) ? local : Array.isArray(remote) ? remote : [],
      deleted: { ...(remoteDeleted || {}), ...(localDeleted || {}) },
      localWon: false
    })
  });
  new vm.Script(mergeSource + '\nthis.mergeStoresLatest = mergeStoresLatest;').runInContext(context);
  return context;
}

function activityContext(initialStore = {}, now = 1000000) {
  let store = initialStore;
  let clock = now;
  const events = [];
  const context = vm.createContext({
    currentUsername: 'randi',
    route: { packageCode: 'H51001', type: 'reading', sectionIndex: 0 },
    readStore: () => store,
    writeStore: value => { store = value; },
    scheduleCloudSync: () => {},
    Date: { now: () => ++clock },
    Math,
    window: { dispatchEvent: event => events.push(event) },
    CustomEvent: function (type, init) { this.type = type; this.detail = init?.detail; }
  });
  new vm.Script(activitySource + '\n' + updateSource +
    '\nthis.createQuestionActivity = createQuestionActivity; this.updateQuestionActivity = updateQuestionActivity;').runInContext(context);
  return { context, getStore: () => store, events };
}

function event(id, timestamp, updatedAt = timestamp, extra = {}) {
  return { id, timestamp, updatedAt, code: 'H51001', type: 'reading', sectionIndex: 0, questionId: String(id), ...extra };
}

test('attempt-history append preserves the 5,000-event cap at boundary sizes', () => {
  for (const initialCount of [4999, 5000, 5001, 10000]) {
    const initial = Array.from({ length: initialCount }, (_, i) => event('old-' + i, i + 1));
    const { context, getStore } = activityContext({ _attempts: initial });
    const id = context.createQuestionActivity('new-question');
    const attempts = getStore()._attempts;
    assert.equal(attempts.length, Math.min(initialCount + 1, 5000), 'initial count ' + initialCount);
    assert.ok(attempts.some(x => x.id === id), 'new event retained at initial count ' + initialCount);
    if (initialCount >= 5000) assert.ok(!attempts.some(x => x.id === 'old-0'), 'oldest event is evicted at initial count ' + initialCount);
  }
});

test('cloud/local attempt merge deduplicates IDs by newest update and sorts by event timestamp', () => {
  const context = mergeContext();
  const local = {
    _attempts: [
      event('same', 30, 300, { status: 'checked', correct: true }),
      event('late', 10),
      event('local-only', 20)
    ]
  };
  const remote = {
    _attempts: [
      event('same', 30, 200, { status: 'answered', correct: null }),
      event('early', 5),
      event('remote-only', 25)
    ]
  };
  const result = context.mergeStoresLatest(local, remote);
  assert.equal(result.store._attempts.length, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(result.store._attempts.map(x => x.id))),
    ['early', 'late', 'local-only', 'remote-only', 'same']);
  const same = result.store._attempts.find(x => x.id === 'same');
  assert.equal(same.updatedAt, 300);
  assert.equal(same.status, 'checked');
  assert.equal(same.correct, true);
});

test('cloud/local merge retains the newest 5,000 unique events from a 10,000-event history', () => {
  const context = mergeContext();
  const local = { _attempts: Array.from({ length: 5000 }, (_, i) => event('local-' + i, i + 5001)) };
  const remote = { _attempts: Array.from({ length: 5000 }, (_, i) => event('remote-' + i, i + 1)) };
  const merged = context.mergeStoresLatest(local, remote).store._attempts;
  assert.equal(merged.length, 5000);
  assert.equal(merged[0].timestamp, 5001);
  assert.equal(merged.at(-1).timestamp, 10000);
  assert.ok(merged.every((x, i) => i === 0 || merged[i - 1].timestamp <= x.timestamp));
});

test('section merge combines answer, checked, and answer-event maps instead of replacing them', () => {
  const context = mergeContext();
  const key = 'H51001|reading|0';
  const result = context.mergeStoresLatest({
    [key]: { answers: { '1': 'A' }, checked: { '1': true }, answerEvents: { '1': 'evt-local' }, updatedAt: 10 }
  }, {
    [key]: { answers: { '2': 'B' }, checked: { '2': true }, answerEvents: { '2': 'evt-remote' }, updatedAt: 20 }
  }).store[key];
  assert.deepEqual(JSON.parse(JSON.stringify(result.answers)), { '1': 'A', '2': 'B' });
  assert.deepEqual(JSON.parse(JSON.stringify(result.checked)), { '1': true, '2': true });
  assert.deepEqual(JSON.parse(JSON.stringify(result.answerEvents)), { '1': 'evt-local', '2': 'evt-remote' });
  assert.equal(result.updatedAt, 20);
});

test('attempts without IDs are ignored during cloud/local merge', () => {
  const context = mergeContext();
  const result = context.mergeStoresLatest(
    { _attempts: [event('valid', 1), { timestamp: 2 }, null] },
    { _attempts: [{ id: '', timestamp: 3 }, event('remote', 4)] }
  ).store._attempts;
  assert.deepEqual(JSON.parse(JSON.stringify(result.map(x => x.id))), ['valid', 'remote']);
});
