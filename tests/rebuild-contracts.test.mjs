import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = await readFile(resolve(here, '../index.html'), 'utf8');

test('preserves existing identity and local storage contracts', () => {
  assert.match(html, /hsk4-kelas-e-username-v1/);
  assert.match(html, /hsk4-kelas-e-progress-v4:/);
  assert.match(html, /hsk4-kelas-e-last-route-v1:/);
  assert.match(html, /function readStore\(/);
  assert.match(html, /function writeStore\(/);
});

test('preserves local section-answer and progress paths', () => {
  assert.match(html, /function getSectionState\(/);
  assert.match(html, /function saveSectionState\(/);
  assert.match(html, /function sectionStats\(/);
  assert.match(html, /function packageStats\(/);
  assert.match(html, /function createQuestionActivity\(/);
  assert.match(html, /function updateQuestionActivity\(/);
});

test('preserves cloud merge semantics and current minimal response behavior', () => {
  assert.match(html, /function mergeStoresLatest\(/);
  assert.match(html, /_deletedStudyPlans/);
  assert.match(html, /_progressResets/);
  assert.match(html, /cloudUrl\('\?username=eq\.'/);
  assert.match(html, /select=data&limit=1/);
  assert.equal((html.match(/Prefer':'return=minimal'/g) || []).length, 2);
});

test('keeps grading entry point and guarded loading wrapper', () => {
  assert.match(html, /function grade\(/);
  assert.match(html, /window\.grade\s*=\s*function/);
  assert.match(html, /hsk-beta-grade-loading-v1-js/);
  assert.match(html, /syncAfterSectionCheck\(/);
});

test('keeps dynamic catalog cache-first and background-refresh contract', () => {
  assert.match(html, /hsk-dynamic-catalog-v6-stable/);
  assert.match(html, /groupsFromCachedCatalog\(/);
  assert.match(html, /discover\(false\)/);
  assert.match(html, /hsk:dynamic-catalog-ready/);
});

test('keeps study-plan deletion tombstones and merge entry points', () => {
  assert.match(html, /function mergePlanArrays\(/);
  assert.match(html, /_deletedStudyPlans/);
  assert.match(html, /function savePlans\(/);
});

test('records the current attempt-history retention behavior until a separate tested redesign', () => {
  assert.equal((html.match(/slice\(-5000\)/g) || []).length, 3,
    'Do not change the three existing 5,000-event retention points during module extraction.');
  assert.match(html, /function attempts\(/);
  assert.match(html, /function getProgressHistory\(/);
});

test('keeps traffic safeguards bounded and avoids frequent automatic pulls', () => {
  assert.match(html, /const CLOUD_PULL_COOLDOWN=15\*60\*1000/);
  assert.match(html, /const CLOUD_SNAPSHOT_MAX_AGE=15\*60\*1000/);
  assert.match(html, /const CLOUD_SYNC_MAX_RETRIES=3/);
  assert.match(html, /cloudSyncRetryCount<CLOUD_SYNC_MAX_RETRIES/);
  assert.doesNotMatch(html, /setTimeout\(\(\)=>pushCloudState\(readStore\(\)\),1500\)/);
});

test('retains the main question and UI structures', () => {
  for (const id of ['exercise', 'result', 'levelsScreen', 'packagesGrid', 'sections', 'parts']) {
    assert.ok(html.includes('id="' + id + '"'), 'Missing key UI node: ' + id);
  }
  assert.match(html, /listening/);
  assert.match(html, /reading/);
  assert.match(html, /studyPlans/);
});
