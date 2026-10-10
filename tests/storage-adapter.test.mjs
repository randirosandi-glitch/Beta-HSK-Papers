import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../src/core/storage-adapter.js'), 'utf8');

function makeStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function loadAdapter(localStorage, username = 'randi') {
  const context = vm.createContext({ currentUsername: username, localStorage, console });
  new vm.Script(source, { filename: 'storage-adapter.js' }).runInContext(context);
  return context;
}

test('keeps the existing per-user progress storage key', () => {
  const context = loadAdapter(makeStore(), 'randi');
  assert.equal(context.storageKey(), 'hsk4-kelas-e-progress-v4:randi');
  context.currentUsername = 'another-user';
  assert.equal(context.storageKey(), 'hsk4-kelas-e-progress-v4:another-user');
  context.currentUsername = '';
  assert.equal(context.storageKey(), 'hsk4-kelas-e-progress-v4:guest');
});

test('round-trips progress JSON without changing its shape', () => {
  const localStorage = makeStore();
  const context = loadAdapter(localStorage, 'randi');
  const store = { 'H51001|reading|0': { answers: { '1': 'B' }, updatedAt: 123 }, _attempts: [{ id: 'evt-1' }] };
  context.writeStore(store);
  assert.deepEqual(JSON.parse(localStorage.getItem('hsk4-kelas-e-progress-v4:randi')), store);
  assert.deepEqual(context.readStore(), store);
});

test('isolates users and safely handles missing or malformed stored JSON', () => {
  const localStorage = makeStore({
    'hsk4-kelas-e-progress-v4:randi': JSON.stringify({ score: 10 }),
    'hsk4-kelas-e-progress-v4:other': '{not-json'
  });
  const context = loadAdapter(localStorage, 'randi');
  assert.deepEqual(context.readStore(), { score: 10 });
  context.currentUsername = 'other';
  assert.deepEqual(context.readStore(), {});
});

test('does not throw when browser storage is unavailable or quota-limited', () => {
  const brokenStorage = {
    getItem() { throw new Error('storage blocked'); },
    setItem() { throw new Error('quota exceeded'); }
  };
  const context = loadAdapter(brokenStorage);
  assert.deepEqual(context.readStore(), {});
  assert.doesNotThrow(() => context.writeStore({ safe: true }));
});
