import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const reliability = await readFile(new URL('../src/core/reliability-fixes.js', import.meta.url), 'utf8');
const functional = await readFile(new URL('../src/core/functional-repair.js', import.meta.url), 'utf8');

const canonicalFunctionalOwners = [
  'openStudyPlans',
  'openStudyPlan',
  'renderStudyPlanDetail',
  'openStudyPlanAddPicker',
  'openStudyPlanPicker',
  'renderStudyPlanPicker',
  'renderStudyPlanAddPicker',
  'selectStudyPlanPickerSource',
  'filterStudyPlanPicker',
  'addPackageDirectlyToStudyPlan',
  'togglePackageInStudyPlan',
  'closeStudyPlanPicker',
  'continueStudyPlan'
];

test('study-plan navigation and picker globals have one repair-layer owner', () => {
  for (const name of canonicalFunctionalOwners) {
    const assignment = new RegExp('window\\.' + name + '\\s*=', 'g');
    assert.equal([...reliability.matchAll(assignment)].length, 0,
      name + ' must not be reassigned by reliability-fixes.js');
    assert.equal([...functional.matchAll(assignment)].length, 1,
      name + ' must have exactly one assignment in functional-repair.js');
  }
});
