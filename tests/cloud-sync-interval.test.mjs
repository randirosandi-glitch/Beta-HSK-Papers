import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../src/core/cloud-sync.js'), 'utf8');
const INTERVAL = 12 * 60 * 60 * 1000;

function makeContext(start = 1_000_000) {
  let now = start;
  let store = { _attempts: [{ id: 'local', timestamp: start }] };
  let remote = { data: { cloudOnly: true } };
  const storage = new Map();
  const calls = { get: 0, create: 0, update: 0 };
  const context = vm.createContext({
    currentUsername: 'learner',
    cloudEnabled: () => true,
    localStorage: {
      getItem: key => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    },
    navigator: { onLine: true },
    Date: { now: () => now },
    readStore: () => store,
    writeStore: value => { store = value; },
    mergeStoresLatest: (local, cloud) => ({ store: { ...(cloud || {}), ...(local || {}) } }),
    cloudFindUser: async () => { calls.get++; return remote; },
    cloudCreateUser: async (_username, data) => { calls.create++; remote = { data: JSON.parse(JSON.stringify(data)) }; return true; },
    cloudUpdateUser: async (_username, data) => { calls.update++; remote = { data: JSON.parse(JSON.stringify(data)) }; return true; },
    renderHome() {},
    renderScores() {},
    renderPackagesScreen() {},
    refreshCurrentProgress() {},
    console: { warn() {} },
    setTimeout: () => 1,
    clearTimeout() {}
  });
  new vm.Script(
    'let cloudSyncTimer=null;let cloudSyncBusy=false;let cloudSyncPending=false;let cloudSyncRetryCount=0;const CLOUD_SYNC_MAX_RETRIES=3;\n' +
    source +
    '\nthis.scheduleCloudSync=scheduleCloudSync;this.flushCloudSync=flushCloudSync;this.pullCloudState=pullCloudState;this.cloudPendingSince=cloudPendingSince;'
  ).runInContext(context);
  return {
    context,
    calls,
    getStore: () => store,
    getRemote: () => remote,
    getPending: () => context.cloudPendingSince(),
    setNow: value => { now = value; },
    advance: ms => { now += ms; },
    setOnline: value => { context.navigator.onLine = value; }
  };
}

test('progress stays local until it has been pending for 12 hours', async () => {
  const { context, calls, getStore, getPending, advance, setNow } = makeContext();
  const initialLocal = JSON.stringify(getStore());

  context.scheduleCloudSync();
  const firstPendingAt = getPending();
  assert.equal(firstPendingAt, 1_000_000);
  assert.equal(JSON.stringify(getStore()), initialLocal);
  assert.deepEqual(calls, { get: 0, create: 0, update: 0 });

  advance(INTERVAL / 2);
  getStore()._attempts.push({ id: 'later-local', timestamp: 1_000_000 + INTERVAL / 2 });
  context.scheduleCloudSync();
  assert.equal(getPending(), firstPendingAt, 'later activity must not reset the batch window');
  assert.equal(await context.flushCloudSync(), false);
  assert.equal(calls.get, 0);

  setNow(firstPendingAt + INTERVAL);
  await context.flushCloudSync();
  assert.deepEqual(calls, { get: 1, create: 0, update: 1 });
  assert.ok(getStore().cloudOnly, 'the cloud copy is merged before the local batch is written');
  assert.equal(getPending(), 0, 'the completed batch clears its local pending marker');
});

test('cloud pulls are limited to one successful request per 12 hours, even when forced', async () => {
  const { context, calls, advance } = makeContext();
  assert.equal(await context.pullCloudState(true), true);
  assert.equal(calls.get, 1);

  advance(INTERVAL - 1);
  assert.equal(await context.pullCloudState(true), false);
  assert.equal(calls.get, 1);

  advance(1);
  assert.equal(await context.pullCloudState(true), true);
  assert.equal(calls.get, 2);
});

test('a due batch remains local while offline and syncs after connectivity returns', async () => {
  const { context, calls, getPending, setOnline, advance } = makeContext();
  context.scheduleCloudSync();
  const pendingAt = getPending();

  advance(INTERVAL);
  setOnline(false);
  assert.equal(context.flushCloudSync(), false);
  assert.equal(calls.get, 0);
  assert.equal(getPending(), pendingAt);

  setOnline(true);
  await context.flushCloudSync();
  assert.equal(calls.get, 1);
  assert.equal(calls.update, 1);
  assert.equal(getPending(), 0);
});
