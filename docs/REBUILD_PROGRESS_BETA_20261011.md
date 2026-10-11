# HSK Papers Beta — Rebuild Progress

Last updated: 2026-10-11
Repository: randirosandi-glitch/Beta-HSK-Papers, branch main.
Stable is out of scope and has not been modified in this rebuild.

## Current checkpoint

- The deployable app remains index.html.
- Forty-two source modules are integrated while preserving the existing classic-script/global interfaces:
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
  - src/styles/auth-accessibility.css — sign-in keyboard-focus treatment.
  - src/styles/scroll-performance.css — top-bar appearance and low-end scroll safeguards.
  - src/styles/responsive-grid.css — viewport-width-based card grid contract.
  - src/styles/answer-feedback.css — correct/incorrect feedback icons.
  - src/styles/hsk5-paper-engine.css — HSK 5 paper-layout styles.
  - src/styles/dark-mode-contrast.css — dark-mode text-contrast rules.
  - src/core/cloud-sync.js — pull/push orchestration, cached cloud snapshot, cooldown, and retry queue.
  - src/core/auth-flow.js — username save/change, user pill, and cloud initialization flow.
  - src/questions/engine.js — existing question rendering, answer selection, and grading implementation.
  - src/questions/workbook-hsk4a-integration.js — workbook catalog integration.
  - src/questions/workbook-answer-sync.js — existing workbook answer synchronization patch.
  - src/questions/verified-question-audit-patch.js — verified question content fixes.
  - src/study-plans/feature-restore.js — existing study-plan feature follow-up.
  - src/study-plans/create-entry.js — existing study-plan creation entry point.
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
- Earlier full contract run after the 30-module extraction: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38068983933
- Contract run after question-engine and patch extraction: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38105623903 (success, 39 tests pass).
- GitHub Pages deployment after the PR #20 runtime update: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38105623520 (success).
- Earlier GitHub Pages deployment for the same runtime index: https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38069015163

## CSS cascade cleanup checkpoint — 2026-10-11

- Removed the separate navigation cascade file and consolidated the effective portrait/landscape navigation rules into `src/styles/responsive-navigation.css`.
- Removed the versioned v38–v46 navbar override blocks and duplicate portrait glass / icon patches.
- Consolidated top-bar geometry/visuals, top-bar inner spacing, brand title rules, tile icon base rules, Back control rules, root/body theme tokens, and the document canvas rules.
- Folded HSK 5 header/numbering and study-plan picker styles into their owning modules; removed an empty HSK 5 header patch and nested writing-field style wrapper.
- The canonical stylesheet is 274,796 bytes (275,236 before the latest pass). PR #21 removed four audited exact duplicate blocks (440 bytes) and regenerated the matching region in `index.html`.
- Other repeated component selectors remain. Broader consolidation is not included because draft PR #17 changed effective keyframe and responsive rules.

## What is not claimed yet

- These are not full browser/end-to-end tests.
- The app has not yet completed the manual regression matrix across phone, tablet, and desktop.
- The large embedded question/data payload, home-history DOM rendering, and some auth/logout UI remain inline.
- Draft PR #17 was closed without merge after a static audit found effective keyframe/responsive changes and malformed document-canvas CSS.

## Next migration step

Progress merge/activity, statistics, recent history, section persistence, study-plan merge, Supabase transport, and selected presentation concerns now have source modules and behavior-focused tests. The study-plan feature, catalog/package runtime, navigation controller, result pagination, weekly dashboard, reliability/repair layers, section renderers, cloud-sync orchestration, auth flow, and selected CSS blocks were extracted into source modules while remaining in their original positions. A targeted correctness fix ensures the active section's answer-event ID map is saved by default, so checked answers can continue updating existing activity records after state persistence; no storage key or record schema changed. The next validation step is the manual regression matrix across phone, tablet, and desktop for sign-in, package opening, answer selection/checking, return navigation, study plans, theme, and responsive layout. Further CSS consolidation should wait until those states are checked. The public Beta page responds with the HSK Papers dashboard, but authenticated exercise and study-plan interactions have not yet been verified. Do not change the 5,000-event retention policy during code movement.

## Permanent guardrails

- Beta main only; never modify Stable.
- Preserve username identity, existing storage key prefixes, stored data shape, study plans, reset tombstones, route restoration, package cache-first/background-refresh behavior, and the single canonical grading path.
- Keep Supabase traffic minimal by design, but do not let traffic optimization replace the rebuild objective.
- Do not claim a behavioral fix from source checks alone.

## Repository housekeeping — 2026-10-11

- A docs-only PR adds a root guide and a documentation index; it does not change runtime files.
- Housekeeping PR #18 removed the unreferenced `beta-scroll-optimization-v1.html` snapshot and redundant `.gitkeep` markers; it is merged into `main`.
- The recovery snapshot remains until a newer rebuild checkpoint has been verified and deliberately retained elsewhere.
- Documentation PR #19 adds the root guide and documentation index; it does not change runtime files.
- A static audit of draft PR #17 found malformed document-canvas CSS and changes to effective keyframe and responsive rules. It was closed without merge; only cascade-preserving CSS cleanup proceeded in PR #21.
- PR #20 is merged into `main`: question/grading logic and selected workbook/study-plan patches were extracted at their existing execution points; duplicate `</style>` and document-end markup were corrected.
- PR #21 is merged into `main`: four cascade-audited duplicate CSS blocks were removed; the broad PR #17 rewrite remains excluded.
- Build synchronization passed for all 42 source modules; all 40 Node tests passed in PR #21 workflow run [#152](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38106661763).
- GitHub Pages deployment after PR #21 completed successfully in [run #411](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38106690395).
- The owner reviewed the live Beta shell/dashboard; the full exercise, study-plan, and responsive regression matrix remains a final manual check.
