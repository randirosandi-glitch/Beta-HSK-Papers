import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = await readFile(resolve(here, '../src/core/study-plan-merge.js'), 'utf8');
const context = vm.createContext({ Date });
new vm.Script(source + '\nthis.mergePlanArrays=mergePlanArrays;').runInContext(context);

test('deletion tombstones prevent stale local and remote plans from resurrecting', () => {
  const result = context.mergePlanArrays(
    [{ id: 'deleted', name: 'old local', updatedAt: 500 }, { id: 'keep', name: 'keep local', updatedAt: 20 }],
    [{ id: 'deleted', name: 'old cloud', updatedAt: 700 }, { id: 'remote', name: 'remote only', updatedAt: 30 }],
    { deleted: 1000 },
    {}
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result.out.map(p => p.id))), ['keep', 'remote']);
  assert.equal(result.deleted.deleted, 1000);
  assert.equal(result.localWon, true);
});

test('conflicting plan versions choose newest updatedAt and prefer local on a tie', () => {
  const result = context.mergePlanArrays(
    [
      { id: 'new-local', name: 'local newer', updatedAt: 30 },
      { id: 'tie', name: 'local tie', updatedAt: 40 }
    ],
    [
      { id: 'new-local', name: 'remote older', updatedAt: 20 },
      { id: 'tie', name: 'remote tie', updatedAt: 40 }
    ],
    {},
    {}
  );
  const byId = Object.fromEntries(result.out.map(p => [p.id, p]));
  assert.equal(byId['new-local'].name, 'local newer');
  assert.equal(byId.tie.name, 'local tie');
  assert.equal(result.localWon, true);
});

test('invalid arrays are ignored and remote-only plans are retained', () => {
  const result = context.mergePlanArrays(
    null,
    [{ id: 'remote-only', name: 'cloud', updatedAt: 10 }, null, { name: 'no id' }],
    null,
    null
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result.out)), [{ id: 'remote-only', name: 'cloud', updatedAt: 10 }]);
  assert.equal(result.localWon, false);
});
