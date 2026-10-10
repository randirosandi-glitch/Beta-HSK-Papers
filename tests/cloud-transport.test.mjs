import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../src/core/cloud-transport.js'), 'utf8');

function makeContext(response = { ok: true, json: async () => [{ data: { sample: true } }] }) {
  const calls = [];
  const context = vm.createContext({
    CLOUD_CONFIG: { url: 'https://example.supabase.co', anonKey: 'public-test-key' },
    CLOUD_TABLE: 'namasiswa',
    cloudEnabled: () => true,
    fetch: async (url, options) => { calls.push({ url, options }); return response; }
  });
  new vm.Script(source + '\nthis.cloudFindUser=cloudFindUser; this.cloudCreateUser=cloudCreateUser; this.cloudUpdateUser=cloudUpdateUser; this.cloudErrorMessage=cloudErrorMessage;').runInContext(context);
  return { context, calls };
}

test('cloud lookup requests only the progress data column and handles usernames safely', async () => {
  const { context, calls } = makeContext();
  const row = await context.cloudFindUser('learner + test');
  assert.deepEqual(JSON.parse(JSON.stringify(row)), { data: { sample: true } });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /rest\/v1\/namasiswa\?username=eq\.learner%20%2B%20test&select=data&limit=1$/);
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.method, undefined);
});

test('cloud create and update use minimal responses and send only the intended data payload', async () => {
  const { context, calls } = makeContext({ ok: true, json: async () => [] });
  const store = { 'H51001|reading|0': { answers: { '1': 'A' } } };
  assert.equal(await context.cloudCreateUser('learner', store), true);
  assert.equal(await context.cloudUpdateUser('learner', store), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Prefer, 'return=minimal');
  assert.deepEqual(JSON.parse(calls[0].options.body), { username: 'learner', data: store });
  assert.equal(calls[1].options.method, 'PATCH');
  assert.equal(calls[1].options.headers.Prefer, 'return=minimal');
  assert.deepEqual(JSON.parse(calls[1].options.body), { data: store });
});

test('cloud transport preserves actionable HTTP error messages', async () => {
  const { context } = makeContext({ ok: false, status: 403 });
  await assert.rejects(context.cloudFindUser('learner'), /RLS policy/);
  assert.match(context.cloudErrorMessage(409), /Username sudah terdaftar/);
  assert.match(context.cloudErrorMessage(500), /HTTP 500/);
});
