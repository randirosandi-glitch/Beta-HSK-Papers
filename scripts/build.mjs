import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const modulePath = resolve(root, 'src/core/storage-adapter.js');
const startMarker = '// BEGIN GENERATED MODULE: src/core/storage-adapter.js';
const endMarker = '// END GENERATED MODULE: src/core/storage-adapter.js';
const checkOnly = process.argv.includes('--check');

const [html, moduleSource] = await Promise.all([
  readFile(indexPath, 'utf8'),
  readFile(modulePath, 'utf8')
]);
const start = html.indexOf(startMarker);
const end = html.indexOf(endMarker, start + startMarker.length);
if (start < 0 || end < 0 || html.indexOf(startMarker, start + 1) >= 0 || html.indexOf(endMarker, end + 1) >= 0) {
  throw new Error('Expected exactly one ordered pair of storage module markers in index.html.');
}
const startLineEnd = html.indexOf('\n', start + startMarker.length);
if (startLineEnd < 0 || startLineEnd > end) throw new Error('Malformed storage module start marker.');
const currentBody = html.slice(startLineEnd + 1, end).trimEnd();
const expectedBody = moduleSource.trimEnd();
if (checkOnly) {
  if (currentBody !== expectedBody) {
    console.error('index.html storage adapter is out of sync with src/core/storage-adapter.js. Run: node scripts/build.mjs');
    process.exitCode = 1;
  } else {
    console.log('Storage adapter build check passed.');
  }
} else {
  const nextHtml = html.slice(0, startLineEnd + 1) + expectedBody + '\n' + html.slice(end);
  await writeFile(indexPath, nextHtml, 'utf8');
  console.log('Updated index.html from src/core/storage-adapter.js.');
}
