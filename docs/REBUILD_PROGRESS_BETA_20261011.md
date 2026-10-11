# HSK Papers Beta — Rebuild Progress

Last updated: 2026-10-11
Repository: randirosandi-glitch/Beta-HSK-Papers, branch main.
Stable is out of scope and has not been modified in this rebuild.

## Current checkpoint

- The deployable app remains index.html.
- The home dashboard now retains weekly progress and the comparison with the previous week; monthly/yearly calculations and their UI/styles are removed.
- Progress saves to local storage immediately. Each first unsynced edit waits at least 12 hours before cloud upload; cloud pulls are limited to one per 12 hours per username/device after the first load.
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
- Source extraction preserves the original script/style order and legacy globals. The 12-hour sync cadence is an explicit behavior change; existing storage keys, serialized data shape, merge logic, and weekly calculations remain compatible.

## Automated safeguards

- tests/rebuild-contracts.test.mjs checks important app/storage/cloud/catalog/grading/study-plan source contracts.
- tests/inline-script-syntax.test.mjs compiles inline JavaScript blocks to catch syntax errors.
- tests/storage-adapter.test.mjs behavior-tests per-user keying, JSON round-trip, malformed data handling, and unavailable/quota-limited storage.
- tests/progress-characterization.test.mjs checks attempt-history boundaries, duplicate-ID merge resolution, timestamp ordering, local/cloud answer-map merges, and 5,000-event retention.
- tests/progress-view-model.test.mjs checks section/package counts, score aggregation, lazy-package caps, and history selection.
- tests/progress-persistence.test.mjs checks answer-event persistence, reset cleanup, and resume-route preservation.
- tests/study-plan-merge.test.mjs checks deletion tombstones and local/cloud plan conflict resolution.
- tests/cloud-transport.test.mjs checks minimal Supabase requests, username encoding, request payloads, and HTTP errors.
- tests/cloud-sync-interval.test.mjs checks local-first 12-hour batching, the pull cooldown, and offline recovery.
- .github/workflows/rebuild-contracts.yml checks module synchronization, reproducible index generation, inline script syntax, and all Node tests.
- The latest source-contract run verified all 42 modules and passed all 44 Node tests: [run #159](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38108533258).
- GitHub Pages deployed the weekly-only dashboard and 12-hour sync update successfully: [run #414](https://github.com/randirosandi-glitch/Beta-HSK-Papers/actions/runs/38108533564).

## CSS cascade cleanup checkpoint — 2026-10-11

- Removed the separate navigation cascade file and consolidated the effective portrait/landscape navigation rules into `src/styles/responsive-navigation.css`.
- Removed the versioned v38–v46 navbar override blocks and duplicate portrait glass / icon patches.
- Consolidated top-bar geometry/visuals, top-bar inner spacing, brand title rules, tile icon base rules, Back control rules, root/body theme tokens, and the document canvas rules.
- Folded HSK 5 header/numbering and study-plan picker styles into their owning modules; removed an empty HSK 5 header patch and nested writing-field style wrapper.
- The canonical stylesheet is 273,828 bytes after removing the unused monthly/yearly dashboard selectors. PR #21 removed four audited exact duplicate blocks (440 bytes) and regenerated the matching region in `index.html`.
- Other repeated component selectors remain. Broader consolidation is not included because draft PR #17 changed effective keyframe and responsive rules.

## What is not claimed yet

- These are not full browser/end-to-end tests; the owner still needs to complete the manual matrix after this deploy.
- The app has not yet completed the manual regression matrix across phone, tablet, and desktop.
- The large embedded question/data payload, home-history DOM rendering, and some auth/logout UI remain inline.
- Draft PR #17 was closed without merge after a static audit found effective keyframe/responsive changes and malformed document-canvas CSS.

## Next validation step

The weekly-only dashboard and local-first 12-hour cloud cadence are merged and deployed. The remaining check is the owner-run phone/tablet/desktop matrix: sign-in, package opening, answering/checking, resume, study plans, themes, and responsive layout. Also compare Supabase Egress and request counts over a comparable period; the source audit predicts fewer requests but cannot measure the service-level savings.

## Permanent guardrails

- Beta main only; never modify Stable.
- Preserve username identity, existing storage key prefixes, stored data shape, study plans, reset tombstones, route restoration, package cache-first/background-refresh behavior, and the single canonical grading path.
- Keep Supabase traffic minimal by design, but do not let traffic optimization replace the rebuild objective.
- Do not claim a behavioral fix from source checks alone.

## Repository state — 2026-10-11

- PRs #18, #19, #20, #21, and #24 are merged into Beta `main`.
- PR #24 is the current runtime checkpoint: weekly-only progress, 12-hour local-first cloud sync, 42-module build sync, and 44 passing Node tests.
- PR #17 was closed without merge after its broad CSS rewrite changed effective keyframe/responsive behavior.
- The separate `Beta-HSK-Papers-Rebuild` repository and Stable were not modified.
