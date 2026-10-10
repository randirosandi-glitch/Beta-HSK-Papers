import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const checkOnly = process.argv.includes('--check');
const html = await readFile(indexPath, 'utf8');
const prefix = '// BEGIN GENERATED MODULE: ';
const modules = [];
let offset = 0;
for (const line of html.split('\n')) {
  if (line.startsWith(prefix)) modules.push({ path: line.slice(prefix.length).trim(), markerEnd: offset + line.length });
  offset += line.length + 1;
}
if (!modules.length) throw new Error('No generated source module markers found in index.html.');

const replacements = [];
for (const item of modules) {
  const endMarker = '// END GENERATED MODULE: ' + item.path;
  const end = html.indexOf(endMarker, item.markerEnd + 1);
  if (end < 0 || html.indexOf(endMarker, end + endMarker.length) >= 0) {
    throw new Error('Expected exactly one end marker for ' + item.path);
  }
  const nextStart = html.indexOf(prefix, item.markerEnd + 1);
  if (nextStart >= 0 && nextStart < end) throw new Error('Nested generated module markers are not allowed.');
  const source = (await readFile(resolve(root, item.path), 'utf8')).trimEnd();
  const current = html.slice(item.markerEnd + 1, end).trimEnd();
  replacements.push({ path: item.path, markerEnd: item.markerEnd, end, source, current });
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
  for (const item of replacements.sort((a, b) => b.markerEnd - a.markerEnd)) {
    output = output.slice(0, item.markerEnd + 1) + item.source + '\n' + output.slice(item.end);
  }
  await writeFile(indexPath, output, 'utf8');
  console.log('Updated index.html from ' + mismatches.length + ' source module(s).');
} else {
  console.log('index.html already matches all source modules.');
}
