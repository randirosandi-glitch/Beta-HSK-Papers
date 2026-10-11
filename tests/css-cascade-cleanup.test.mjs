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
      if (source[i] === '\\') { i += 2; continue; }
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
          if (source[j] === '\\') { j++; continue; }
          if (source[j] === innerQuote) innerQuote = '';
          continue;
        }
        if (source[j] === '"' || source[j] === "'") { innerQuote = source[j]; continue; }
        if (source[j] === '{') depth++;
        else if (source[j] === '}') depth--;
      }
      const body = source.slice(i + 1, j - 1);
      if (/^@(media|supports|container|layer|scope)\b/.test(prelude)) {
        collectRules(body, context + '|' + normalizeAtRule(prelude), baseOffset + i + 1, out);
      } else {
        out.push({ selector: prelude, body, context });
      }
      i = j; chunkStart = j; continue;
    }
    i++;
  }
  return out;
}

const normalize = value => value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim();

function normalizeAtRule(prelude) {
  const collapsed = prelude.replace(/\s+/g, ' ').trim();
  if (!/^@media\\b/.test(collapsed)) return collapsed;
  return '@media' + collapsed.slice(6).replace(/^\s*/, '').replace(/\s*\(\s*/g, '(').replace(/\s*\)\s*/g, ')').replace(/\s*:\s*/g, ':');
}

function declarationsOf(body) {
  const parts = [];
  let start = 0, quote = '', comment = false, parenDepth = 0;
  for (let i = 0; i < body.length; i++) {
    if (comment) {
      if (body[i] === '*' && body[i + 1] === '/') { comment = false; i++; }
      continue;
    }
    if (!quote && body[i] === '/' && body[i + 1] === '*') { comment = true; i++; continue; }
    if (quote) {
      if (body[i] === '\\') { i++; continue; }
      if (body[i] === quote) quote = '';
      continue;
    }
    if (body[i] === '"' || body[i] === "'") { quote = body[i]; continue; }
    if (body[i] === '(') parenDepth++;
    else if (body[i] === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (body[i] === ';' && parenDepth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  parts.push(body.slice(start));
  return parts.map(part => {
    let quote = '', comment = false, parenDepth = 0, colon = -1;
    for (let i = 0; i < part.length; i++) {
      if (comment) {
        if (part[i] === '*' && part[i + 1] === '/') { comment = false; i++; }
        continue;
      }
      if (!quote && part[i] === '/' && part[i + 1] === '*') { comment = true; i++; continue; }
      if (quote) {
        if (part[i] === '\\') { i++; continue; }
        if (part[i] === quote) quote = '';
        continue;
      }
      if (part[i] === '"' || part[i] === "'") { quote = part[i]; continue; }
      if (part[i] === '(') parenDepth++;
      else if (part[i] === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (part[i] === ':' && parenDepth === 0) { colon = i; break; }
    }
    if (colon < 0) return null;
    const property = normalize(part.slice(0, colon));
    const rawValue = normalize(part.slice(colon + 1));
    if (!property || !rawValue) return null;
    const important = /!important$/i.test(rawValue);
    const value = rawValue.replace(/\s*!important$/i, '').trim();
    return { property: property.startsWith('--') ? property : property.toLowerCase(), value, important };
  }).filter(Boolean);
}

test('canonical CSS contains no exact duplicate rule blocks in the same cascade context', () => {
  const seen = new Map();
  const duplicates = [];
  for (const rule of collectRules(css)) {
    const key = rule.context + '\n' + normalize(rule.selector) + '\n' + normalize(rule.body);
    if (seen.has(key)) duplicates.push({ selector: normalize(rule.selector), context: rule.context });
    else seen.set(key, true);
  }
  assert.deepEqual(duplicates, [], 'Remove exact duplicate CSS blocks; do not conflate different media contexts.');
});

test('canonical CSS does not repeat identical declarations for the same selector and cascade context', () => {
  const seenBySelector = new Map();
  const duplicates = [];
  for (const rule of collectRules(css)) {
    const selectorKey = rule.context + '\n' + normalize(rule.selector);
    if (!seenBySelector.has(selectorKey)) seenBySelector.set(selectorKey, new Set());
    const seen = seenBySelector.get(selectorKey);
    for (const declaration of declarationsOf(rule.body)) {
      const key = declaration.property + '\n' + declaration.value + '\n' + declaration.important;
      if (seen.has(key)) duplicates.push({ selector: normalize(rule.selector), property: declaration.property, value: declaration.value });
      else seen.add(key);
    }
  }
  assert.deepEqual(duplicates, [], 'Remove repeated identical declarations, but preserve distinct responsive/theme contexts.');
});
