import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/styles/canonical.css', import.meta.url), 'utf8');
const auditedRules = [
  ['body:not(.dark) #packagesScreen .statusPillV6 i', 'display:block!important;width:7px!important;height:7px!important;border-radius:50%!important;background:currentColor!important;'],
  ['body.dark #packagesScreen .statusPillV6 i', 'display:block!important;width:7px!important;height:7px!important;border-radius:50%!important;'],
  ['#levelsScreen .levelCard5::before', 'background:#8197c8!important;']
];

function skipTrivia(source, index) {
  while (index < source.length) {
    if (/\s/.test(source[index])) { index++; continue; }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    break;
  }
  return index;
}

function matchingBrace(source, open) {
  let depth = 1, quote = '', comment = false;
  for (let index = open + 1; index < source.length; index++) {
    if (comment) {
      if (source[index] === '*' && source[index + 1] === '/') { comment = false; index++; }
      continue;
    }
    if (quote) {
      if (source[index] === '\\') { index++; continue; }
      if (source[index] === quote) quote = '';
      continue;
    }
    if (source.startsWith('/*', index)) { comment = true; index++; continue; }
    if (source[index] === '"' || source[index] === "'") { quote = source[index]; continue; }
    if (source[index] === '{') depth++;
    else if (source[index] === '}' && --depth === 0) return index;
  }
  throw new Error('Unbalanced CSS block');
}

function rootStyleRules(source) {
  const rules = [];
  let index = 0;
  while ((index = skipTrivia(source, index)) < source.length) {
    const start = index;
    let quote = '', comment = false, parens = 0, brackets = 0, open = -1, statement = false;
    for (let cursor = index; cursor < source.length; cursor++) {
      if (comment) {
        if (source[cursor] === '*' && source[cursor + 1] === '/') { comment = false; cursor++; }
        continue;
      }
      if (quote) {
        if (source[cursor] === '\\') { cursor++; continue; }
        if (source[cursor] === quote) quote = '';
        continue;
      }
      if (source.startsWith('/*', cursor)) { comment = true; cursor++; continue; }
      if (source[cursor] === '"' || source[cursor] === "'") { quote = source[cursor]; continue; }
      if (source[cursor] === '(') parens++;
      else if (source[cursor] === ')') parens = Math.max(0, parens - 1);
      else if (source[cursor] === '[') brackets++;
      else if (source[cursor] === ']') brackets = Math.max(0, brackets - 1);
      else if (!parens && !brackets && source[cursor] === '{') { open = cursor; break; }
      else if (!parens && !brackets && source[cursor] === ';') {
        index = cursor + 1;
        statement = true;
        break;
      }
    }
    if (statement) continue;
    if (open < 0) break;
    const close = matchingBrace(source, open);
    const selector = source.slice(start, open).trim();
    if (!selector.startsWith('@')) {
      const body = source.slice(open + 1, close).replace(/\s+/g, '').trim();
      rules.push({ selector, body });
    }
    index = close + 1;
  }
  return rules;
}

const normalizeBody = body => body.replace(/\s+/g, '').trim();

test('audited cascade cleanup keeps one exact copy of each redundant rule', () => {
  const rules = rootStyleRules(css);
  for (const [selector, body] of auditedRules) {
    const count = rules.filter(rule => rule.selector === selector && normalizeBody(rule.body) === normalizeBody(body)).length;
    assert.equal(count, 1, selector + ' should have one exact rule copy');
  }
});
