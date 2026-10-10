# HSK Papers Beta — Rebuild Architecture Plan
Date: 2026-10-11
Scope: `randirosandi-glitch/Beta-HSK-Papers`, branch `main`, current `index.html` only.
Safety rule: do not modify Stable. This document is planning-only; it does not change app runtime behavior.

## Goals
- Reduce the monolithic `index.html` safely, with one clear owner for each responsibility.
- Preserve existing account identity, local progress, cloud sync, study plans, package catalog, question rendering, grading, navigation, and responsive appearance.
- Keep the current app working at each migration checkpoint; do not replace everything in one pass.
- Keep package JSON data in its current data repository and retain cache-first/background-refresh behavior.

## Current verified anchors
- Core app and initialization are primarily around lines 3943–4897.
- Progress storage uses `hsk4-kelas-e-progress-v4:` plus the active username (around lines 4262–4265).
- Last-route storage uses `hsk4-kelas-e-last-route-v1:` plus username (around lines 4258–4261).
- Attempt events use `_attempts`, `_lastActivity`, `_resume`, and section state keys. Activity history is capped by `slice(-5000)` in recording/merge paths (around lines 4116, 4556, 4569).
- The dynamic catalog uses cache key `hsk-dynamic-catalog-v6-stable` and loads package JSON from `randirosandi-glitch/latihanhsk` (runtime starts around line 6422).
- A final grading wrapper replaces `window.grade` near the end of the file (around lines 8124–8149); this is a critical override and must be retained until deliberately integrated into a single grading owner.
- CSS is layered across 29 style blocks, with numerous `!important` overrides. Do not delete rules just because they look old; confirm which rules affect computed layout first.

## Target module boundaries
The target is a set of small source files, not an immediate rewrite. Suggested layout:

```text
index.html                  # semantic shell, stylesheet/script loading order
src/styles/tokens.css       # theme variables and global design tokens
src/styles/base.css         # reset, typography, global surfaces
src/styles/navigation.css   # portrait bottom nav and landscape sidebar
src/styles/screens.css      # home, levels, package, exercise, score, study plans
src/styles/exercise.css     # question sheets, options, feedback, writing fields
src/styles/responsive.css   # viewport breakpoints and orientation rules
src/core/state.js           # route and in-memory exercise state
src/core/storage.js         # versioned local state read/write and migrations
src/core/progress.js        # section state, attempts, resume, statistics
src/core/cloud-sync.js      # identity lookup, pull/merge/push and sync queue
src/core/auth.js            # username registration/login/logout UI flow
src/core/navigation.js      # screen changes, route persistence and restoration
src/questions/model.js      # question model normalization and answer checking
src/questions/render.js     # question markup and input interactions
src/questions/grading.js    # one canonical grading implementation and wrapper
src/catalog/catalog.js      # cached discovery and dynamic package loading
src/study-plans/plans.js    # plan CRUD, tombstones, package membership
src/ui/components.js        # shared notice/modal/loading UI
tests/regression-checklist.md
```

If the hosting environment cannot reliably serve these assets, keep the single-file delivery as the final build artifact and assemble it from source files during development. Do not assume module imports work until deployment is verified.

## Non-negotiable compatibility contracts
1. Do not change the username identity rules or current cloud user lookup/create behavior without a migration plan.
2. Preserve the local-storage keys listed above and read the existing data shape. If storage format must change, implement a backward-compatible migration and test with a copy of real-shaped data.
3. Preserve cloud merge semantics for section timestamps, study-plan tombstones, reset markers, resume route, and attempt IDs.
4. Do not silently truncate total user progress. The existing 5,000-attempt retention behavior is an explicit issue to resolve with a compatibility-safe strategy; test how score/stat screens consume `_attempts` before changing the schema.
5. Preserve package discovery from cache first, then background refresh; preserve the existing package repository and package naming.
6. Preserve route restoration after refresh, including package loading before exercise restoration.
7. Keep a single canonical grading function. Do not remove the current wrapper until its busy-state/overlay behavior is integrated and tested.
8. Preserve current Reading and Listening paper-like layouts, audio/transcript behavior, answer checking, and existing special package behavior.
9. Light Mode remains the layout reference. Dark Mode changes colors only. No new shadows or heavy blur; preserve the responsive portrait/landscape navigation contract.

## Migration sequence
### Phase 0 — Freeze and inventory
- Confirm baseline commit/blob and retain the existing backup.
- Generate an inventory of global functions, global assignments, event handlers, storage keys, cloud endpoints, CSS block IDs, and overrides.
- Record which functions are intentionally wrapped or overridden and in what order.

### Phase 1 — Characterization tests
- Build a manual regression checklist before moving code.
- Test fresh account, existing account, offline boot, cloud reconnect, refresh/resume, package discovery, answer persistence, grading, scores, study-plan add/remove/delete, and responsive layouts.
- Capture representative DOM screenshots and package/section state fixtures.

### Phase 2 — Extract contracts first
- Define the existing route, progress, attempt, and study-plan data contracts without changing their serialized shape.
- Move pure helpers first (normalization, IDs, question-model helpers) and compare output before/after.
- Keep a compatibility facade for existing inline handlers while modules are introduced.

### Phase 3 — Extract storage and progress
- Move local storage read/write and section-state logic together.
- Move attempt history and progress aggregation next.
- Add migration/compatibility tests; do not change the attempt retention policy in the same commit as code movement.

### Phase 4 — Extract cloud and auth
- Move cloud request helpers, username flow, pull/merge/push, and queue together.
- Verify conflict resolution, offline behavior, and two-device updates before proceeding.

### Phase 5 — Extract navigation and catalog
- Move route persistence/restoration and navigation as one unit.
- Move dynamic catalog discovery and package loading as another unit.
- Verify cached first paint and background refresh; ensure a deep route waits for package data only when necessary.

### Phase 6 — Extract question engine and grading
- Move model normalization, rendering, answer events, checking, and grading.
- Consolidate the `window.grade` wrapper only after baseline grading tests pass.
- Regression-test Reading, Listening, sentence ordering, guided writing, picture writing, and all existing section-check buttons.

### Phase 7 — Extract styles by responsibility
- Move tokens/base styles first, then navigation, screens, exercise, and responsive rules.
- Compare computed styles and screenshots in Light/Dark, phone portrait, tablet portrait/landscape, and desktop.
- Remove duplicate/obsolete rules only with evidence that they are unused.

### Phase 8 — Build, validate, and deploy to Beta
- If source modules are used, assemble a single deployable artifact if required by hosting.
- Run syntax checks and the full regression checklist.
- Update Beta only after all tests pass. Stable remains untouched.

## Regression checklist (minimum)
- Account: create/login existing username; correct identity remains after refresh.
- Data safety: local progress and cloud progress remain visible; offline use does not wipe data; reconnect merges changes.
- Progress: answer, unanswer/retry, check section, refresh, resume; counts and score remain correct.
- Attempt history: exceed 5,000 answered questions and confirm the intended lifetime progress/statistics are not capped accidentally.
- Catalog: cached catalog first paint, background refresh, open HSK levels, workbooks, and load JSON package.
- Navigation: home → levels → package → sections → exercise → back; restore exercise route after refresh.
- Grading: button remains present, disables during checking, reports score, does not jump unexpectedly to another screen.
- Listening: all answer options remain visible; transcript/short question visibility follows the existing HSK-specific rules; audio controls do not duplicate.
- Reading: passage and questions maintain the original paper layout and responsive columns.
- Study plans: add/remove package, rename/edit/delete plan, deleted plan does not reappear after cloud merge.
- UI: Light/Dark parity, no unexpected shadows/glow, no horizontal overflow, compact cards in landscape.

## Stop conditions
Stop and revert the current migration checkpoint if an existing account appears empty, progress is overwritten, cloud merge loses newer data, question JSON fails to load, grading no longer works, or layout changes outside the intended scope. Never use Stable as a test target.
