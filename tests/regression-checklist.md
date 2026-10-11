# HSK Papers Beta — Rebuild Regression Checklist

Scope: Beta main only. Stable is explicitly out of scope.

## How to run the first automated gate

From a local checkout with Node.js installed:

    node --test

The initial automated gate is a source-contract test, not a browser test. It catches accidental removal of critical interfaces while the monolith is being decomposed. Passing it does not prove the app works in a real browser.

## Release blockers

- [ ] Existing username still resolves to the same local and cloud progress.
- [ ] Refresh restores the last route and the correct package/section.
- [ ] Answering and changing an answer persists immediately to local storage.
- [ ] Section-check button remains present, gives the same result, and does not unexpectedly navigate away.
- [ ] Correct/incorrect feedback matches the current answer key.
- [ ] Reading paper-like layout remains intact at phone, tablet portrait, tablet landscape, and desktop widths.
- [ ] Listening options stay visible; question/transcript visibility follows the current HSK-specific rules; no duplicate audio players.
- [ ] Study-plan add/remove/rename/delete survives refresh and cloud merge; deleted plans do not reappear.
- [ ] Cached catalog renders first, then refreshes in the background; opening a package loads its JSON.
- [ ] Offline use does not erase progress; pending changes stay queued and merge after the 12-hour window when the app is active and online.
- [ ] Username identity, progress keys, study plans, reset tombstones, resume metadata, and attempt IDs remain compatible.
- [ ] Account test makes no Supabase requests, per the existing project rule.
- [ ] Cloud pulls are limited to one per 12 hours per username/device after the initial pull; local changes queue for at least 12 hours and are not uploaded per answer.
- [ ] No horizontal overflow; Light Mode remains the layout master; Dark Mode changes colors only; no new shadows or heavy blur.
- [ ] Landscape cards remain compact.
- [ ] Activity tests cover 4,999, 5,000, 5,001, and 10,000 events, duplicate IDs, out-of-order timestamps, and local/cloud merge.

## Browser matrix

| Device class | Theme | Must verify |
|---|---|---|
| Phone portrait | Light + Dark | Login, navigation, answer, check, resume |
| Tablet portrait | Light + Dark | Reading passage and options, listening controls |
| Tablet landscape | Light + Dark | Card density, sidebar navigation, no overflow |
| Desktop | Light + Dark | Two-column paper layout, grading, study plans |

## Data fixtures

Use synthetic fixtures only; never commit real usernames, account data, or Supabase payloads.

Minimum fixture families:
- Fresh user with empty store.
- Existing user with section answers and checked answers.
- Store with multiple packages, sections, and resume metadata.
- Study plans with live entries and deleted-plan tombstones.
- Progress-reset tombstones.
- Activity history with duplicate IDs, timestamp ties, out-of-order timestamps, and more than 5,000 events.
- Local/cloud stores with conflicting section timestamps and disjoint answers.

## Rebuild rule

Keep storage keys and serialized progress shape stable during refactors. A sync-cadence change must be explicitly scoped and tested; verify affected browser states before promoting it.
## Current checkpoint — 2026-10-11

- PR #24 is merged into Beta `main` as commit `a561e1414434a675d353ef2412f083b58d647bbe`.
- The build check passed for all 42 source modules and all 44 Node tests passed in [workflow run #159](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38108533258).
- GitHub Pages deployment completed successfully in [run #414](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38108533564). The live dashboard now shows weekly progress and weekly comparison only.
- Cloud changes stay local for at least 12 hours before upload; cloud pulls are limited to once per 12 hours per username/device after the initial pull.
- The phone/tablet/desktop manual matrix above is still pending for the owner to verify. Source tests do not substitute for exercising the app in a browser.
