# HSK Papers Beta — Rebuild Progress

Last updated: 2026-10-11
Repository: randirosandi-glitch/Beta-HSK-Papers, branch main.
Stable is out of scope and has not been modified in this rebuild.

## Current checkpoint

- The deployable app remains index.html.
- Thirty source fragments have been extracted while preserving the existing classic-script/global interfaces:
  - src/core/storage-adapter.js — storage key, readStore(), writeStore().
  - src/core/route-persistence.js — LAST_ROUTE_KEY and the three existing window route-persistence functions.
  - src/core/progress.js — progress-reset helpers, local/cloud store merge, and question-activity create/update helpers.
  - src/core/progress-stats.js — section/package statistics and lazy-package progress calculations.
  - src/core/progress-history.js — recent package history selection helpers.
  - src/core/progress-persistence.js — save/clear section state, reset-tombstone cleanup, and resume metadata.
  - src/core/study-plan-merge.js — local/cloud plan version resolution and deletion tombstones.
  - src/core/cloud-transport.js — Supabase REST lookup/create/update helpers with minimal response payloads.
  - src/study-plans/feature.js — existing study-plan feature script.
  - src/catalog/runtime.js — existing dynamic catalog and package-loading runtime.
  - src/ui/navigation-controller.js — existing navigation controller.
  - src/ui/result-pagination.js — existing result/question pagination script.
  - src/ui/weekly-dashboard.js — existing weekly progress dashboard.
  - src/core/progress-reset-controls.js — progress-reset controls and tombstone-aware reset flows.
  - src/questions/reading-passage-loader.js — reading-passage loading/integrity layer.
  - src/questions/load-recovery.js — question-load recovery hook.
  - src/ui/dialogs.js — existing app dialog helpers.
  - src/core/reliability-fixes.js — existing reliability patch layer.
  - src/core/functional-repair.js — existing functional repair layer.
  - src/ui/parts-renderer.js — existing parts renderer.
  - src/ui/section-renderer.js — existing section renderer.
  - src/styles/canonical.css — existing consolidated canonical stylesheet.
  - src/styles/responsive-navigation.css — existing responsive navigation rules.
  - src/styles/study-plans.css — existing study-plan presentation rules.
  - src/styles/grade-loading.css — grading loading-state styles.
  - src/styles/hsk5-paper-engine.css — HSK 5 paper-layout styles.
  - src/styles/navigation-final-cascade.css — final navigation cascade.
  - src/styles/dark-mode-contrast.css — dark-mode text-contrast rules.
  - src/core/cloud-sync.js — pull/push orchestration, cached cloud snapshot, cooldown, and retry queue.
  - src/core/auth-flow.js — username save/change, user pill, and cloud initialization flow.
- scripts/build.mjs assembles the source fragments back into the marked regions of index.html.
- The build is designed to keep a single-file deployment artifact while source modules are separated for maintainability.
- Source extraction preserves the original script/style order and legacy globals. The only targeted behavior correction so far is persisting the active answer-event map by default; no storage key or serialized data schema migration was introduced.

## Automated safeguards

- tests/rebuild-contracts.test.mjs checks important app/storage/cloud/catalog/grading/study-plan source contracts.
- tests/inline-script-syntax.test.mjs compiles inline JavaScript blocks to catch syntax errors.
- tests/storage-adapter.test.mjs behavior-tests per-user keying, JSON round-trip, malformed data handling, and unavailable/quota-limited storage.
- tests/progress-characterization.test.mjs checks attempt-history boundaries, duplicate-ID merge resolution, timestamp ordering, local/cloud answer-map merges, and 5,000-event retention.
- tests/progress-view-model.test.mjs checks section/package counts, score aggregation, lazy-package caps, and history selection.
- tests/progress-persistence.test.mjs checks answer-event persistence, reset cleanup, and resume-route preservation.
- tests/study-plan-merge.test.mjs checks deletion tombstones and local/cloud plan conflict resolution.
- tests/cloud-transport.test.mjs checks minimal Supabase requests, username encoding, request payloads, and HTTP errors.
- .github/workflows/rebuild-contracts.yml checks module synchronization, reproducible index generation, inline script syntax, and all Node tests.
- Latest source-contract runs are recorded in GitHub Actions; the combined JavaScript/CSS marker build check passed before the latest auth-flow extraction. Latest full contract run: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38068859044

## What is not claimed yet

- These are not full browser/end-to-end tests.
- The app has not yet completed the manual regression matrix across phone, tablet, and desktop.
- The main question/data script (including embedded question data), home-history DOM rendering, canonical grading implementation and its final wrapper, some auth/logout UI, study-plan follow-up patches, and most remaining CSS override blocks remain inline.

## Next migration step

Progress merge/activity, statistics, recent history, section persistence, study-plan merge, and Supabase transport now have source modules and behavior-focused tests. The study-plan feature, catalog/package runtime, navigation controller, result pagination, weekly dashboard, reliability/repair layers, section renderers, cloud-sync orchestration, auth flow, and selected CSS blocks were extracted into source modules while remaining in their original positions. A targeted correctness fix ensures the active section's answer-event ID map is saved by default, so checked answers can continue updating existing activity records after state persistence; no storage key or record schema changed. Next: run the final contract suite after any further changes and perform a focused browser smoke check of sign-in, package opening, answer selection/checking, return navigation, study plans, and theme/responsive behavior. The public Beta page responds with the HSK Papers shell, but the full authenticated interaction matrix has not yet been verified. Do not change the 5,000-event retention policy during code movement.

## Permanent guardrails

- Beta main only; never modify Stable.
- Preserve username identity, existing storage key prefixes, stored data shape, study plans, reset tombstones, route restoration, package cache-first/background-refresh behavior, and the single canonical grading path.
- Keep Supabase traffic minimal by design, but do not let traffic optimization replace the rebuild objective.
- Do not claim a behavioral fix from source checks alone.
