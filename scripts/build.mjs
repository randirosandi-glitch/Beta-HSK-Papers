import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const checkOnly = process.argv.includes('--check');
const html = await readFile(indexPath, 'utf8');
const startPattern = /^\\/\\/ BEGIN GENERATED MODULE: (src\\/[^\\n]+)$/gm;
const modules = [...html.matchAll(startPattern)].map(match => ({
  path: match[1],
  start: match.index,
  markerEnd: match.index + match[0].length
}));
if (!modules.length) throw new Error('No generated source module markers found in index.html.');

const replacements = [];
for (const item of modules) {
  const endMarker = '// END GENERATED MODULE: ' + item.path;
  const end = html.indexOf(endMarker, item.markerEnd);
  if (end < 0 || html.indexOf(endMarker, end + endMarker.length) >= 0) {
    throw new Error('Expected exactly one end marker for ' + item.path);
  }
  const nextStart = html.indexOf('// BEGIN GENERATED MODULE:', item.markerEnd);
  if (nextStart >= 0 && nextStart < end) throw new Error('Nested generated module markers are not allowed.');
  const lineEnd = html.indexOf('\\n', item.markerEnd);
  if (lineEnd < 0 || lineEnd > end) throw new Error('Malformed start marker for ' + item.path);
  const source = (await readFile(resolve(root, item.path), 'utf8')).trimEnd();
  const current = html.slice(lineEnd + 1, end).trimEnd();
  replacements.push({ path: item.path, lineEnd, end, source, current });
}

const mismatches = replacements.filter(x => x.current !== x.source);
if (checkOnly) {
  if (mismatches.length) {
    console.error('Generated index module(s) out of sync: ' + mismatches.map(x => x.path).join(', '));
    console.error('Run: node scripts/build.mjs');
    process.exitCode = 1;
  } else {
    console.log('Build check passed for ' + replacements.length + ' source module(s).');
  }
} else if (mismatches.length) {
  let output = html;
  for (const item of replacements.sort((a, b) => b.lineEnd - a.lineEnd)) {
    output = output.slice(0, item.lineEnd + 1) + item.source + '\\n' + output.slice(item.end);
  }
  await writeFile(indexPath, output, 'utf8');
  console.log('Updated index.html from ' + mismatches.length + ' source module(s).');
} else {
  console.log('index.html already matches all source modules.');
}
