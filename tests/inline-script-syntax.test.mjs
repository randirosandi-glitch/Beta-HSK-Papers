import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, '../index.html'), 'utf8');

test('all inline JavaScript blocks parse without syntax errors', () => {
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  assert.ok(blocks.length > 0, 'No inline script blocks found.');
  let checked = 0;
  for (let i = 0; i < blocks.length; i++) {
    const attrs = blocks[i][1] || '';
    const source = blocks[i][2] || '';
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = attrs.match(/\btype\s*=\s*['\"]([^'\"]+)['\"]/i)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'application/javascript', 'module'].includes(type)) continue;
    if (!source.trim()) continue;
    checked++;
    assert.doesNotThrow(() => new vm.Script(source, { filename: 'inline-script-' + (i + 1) + '.js' }),
      'Inline script #' + (i + 1) + ' has a syntax error.');
  }
  assert.ok(checked >= 10, 'Expected to check the app scripts, only checked ' + checked);
});
