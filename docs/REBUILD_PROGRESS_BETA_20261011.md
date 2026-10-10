# HSK Papers Beta — Rebuild Progress

Last updated: 2026-10-11
Repository: randirosandi-glitch/Beta-HSK-Papers, branch main.
Stable is out of scope and has not been modified in this rebuild.

## Current checkpoint

- The deployable app remains index.html.
- Two source fragments have been extracted while preserving the existing classic-script/global interfaces:
  - src/core/storage-adapter.js — storage key, readStore(), writeStore().
  - src/core/route-persistence.js — LAST_ROUTE_KEY and the three existing window route-persistence functions.
- scripts/build.mjs assembles the source fragments back into the marked regions of index.html.
- The build is designed to keep a single-file deployment artifact while source modules are separated for maintainability.
- Runtime behavior for these two fragments is intentionally unchanged; no storage key or serialized data schema migration was introduced.

## Automated safeguards

- tests/rebuild-contracts.test.mjs checks important app/storage/cloud/catalog/grading/study-plan source contracts.
- tests/inline-script-syntax.test.mjs compiles inline JavaScript blocks to catch syntax errors.
- tests/storage-adapter.test.mjs behavior-tests per-user keying, JSON round-trip, malformed data handling, and unavailable/quota-limited storage.
- .github/workflows/rebuild-contracts.yml checks module synchronization, reproducible index generation, and all Node tests.
- Latest successful contract workflow: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38067497265

## What is not claimed yet

- These are not full browser/end-to-end tests.
- The app has not yet completed the manual regression matrix across phone, tablet, and desktop.
- The progress/attempt merge logic, grading implementation, dynamic catalog, and CSS have not yet been extracted.

## Next migration step

Build behavioral characterization tests for progress and attempt-history handling, including 4,999, 5,000, 5,001, and 10,000 events plus duplicate IDs and local/cloud merges. Then extract the progress model as a separate checkpoint. Do not change the attempt-history policy during code movement; decide that separately with compatibility tests.

## Permanent guardrails

- Beta main only; never modify Stable.
- Preserve username identity, existing storage key prefixes, stored data shape, study plans, reset tombstones, route restoration, package cache-first/background-refresh behavior, and the single canonical grading path.
- Keep Supabase traffic minimal by design, but do not let traffic optimization replace the rebuild objective.
- Do not claim a behavioral fix from source checks alone.
