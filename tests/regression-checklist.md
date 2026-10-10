# HSK Papers Beta — Rebuild Regression Checklist

Scope: Beta main only. Stable is explicitly out of scope.

## How to run the first automated gate

From a local checkout with Node.js installed:

    node --test tests/rebuild-contracts.test.mjs

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
- [ ] Offline use does not erase progress; reconnect merges local/cloud changes.
- [ ] Username identity, progress keys, study plans, reset tombstones, resume metadata, and attempt IDs remain compatible.
- [ ] Account test makes no Supabase requests, per the existing project rule.
- [ ] Supabase GET/POST/PATCH behavior remains minimal and does not add requests for ordinary navigation or each answer.
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

Extract one responsibility at a time. Run the automated gate after every extraction. Run the relevant browser tests before promoting that checkpoint. Do not combine an architectural move with a storage schema change or a visual redesign.