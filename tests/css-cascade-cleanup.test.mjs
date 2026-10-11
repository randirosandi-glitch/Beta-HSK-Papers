import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = await readFile(resolve(here, '../src/styles/canonical.css'), 'utf8');

function collectRules(source, context = '', baseOffset = 0, out = []) {
  let i = 0, chunkStart = 0, quote = '', comment = false, parenDepth = 0;
  while (i < source.length) {
    if (comment) {
      if (source[i] === '*' && source[i + 1] === '/') { comment = false; i += 2; continue; }
      i++; continue;
    }
    if (!quote && source[i] === '/' && source[i + 1] === '*') { comment = true; i += 2; continue; }
    if (quote) {
      if (source[i] === '\\\\') { i += 2; continue; }
      if (source[i] === quote) quote = '';
      i++; continue;
    }
    if (source[i] === '"' || source[i] === "'") { quote = source[i++]; continue; }
    if (source[i] === '(') { parenDepth++; i++; continue; }
    if (source[i] === ')') { parenDepth = Math.max(0, parenDepth - 1); i++; continue; }
    if (parenDepth === 0 && source[i] === '{') {
      const prelude = source.slice(chunkStart, i).trim();
      let depth = 1, j = i + 1, innerQuote = '', innerComment = false;
      for (; j < source.length && depth; j++) {
        if (innerComment) {
          if (source[j] === '*' && source[j + 1] === '/') { innerComment = false; j++; }
          continue;
        }
        if (!innerQuote && source[j] === '/' && source[j + 1] === '*') { innerComment = true; j++; continue; }
        if (innerQuote) {
          if (source[j] === '\\\\') { j++; continue; }
          if (source[j] === innerQuote) innerQuote = '';
          continue;
        }
        if (source[j] === '"' || source[j] === "'") { innerQuote = source[j]; continue; }
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
      }
      const body = source.slice(i + 1, j - 1);
      if (/^@(media|supports|container|layer|scope)\\b/.test(prelude)) {
        collectRules(body, context + '|' + prelude.replace(/\\s+/g, ' ').trim(), baseOffset + i + 1, out);
      } else {
        out.push({ selector: prelude, body, context, start: baseOffset + chunkStart, end: baseOffset + j });
      }
      i = j; chunkStart = j; continue;
    }
    i++;
  }
  return out;
}

const normalize = value => value.replace(/\\/\*[\\s\\S]*?\\*\//g, '').replace(/\\s+/g, ' ').trim();

test('canonical CSS contains no exact duplicate rule blocks in the same cascade context', () => {
  const seen = new Map();
  const duplicates = [];
  for (const rule of collectRules(css)) {
    const key = rule.context + '\\n' + normalize(rule.selector) + '\\n' + normalize(rule.body);
    if (seen.has(key)) duplicates.push({ selector: normalize(rule.selector), context: rule.context });
    else seen.set(key, true);
  }
  assert.deepEqual(duplicates, [], 'Remove exact duplicate CSS blocks; do not conflate different media contexts.');
});
