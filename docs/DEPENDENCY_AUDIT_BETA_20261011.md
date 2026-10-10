# HSK Papers Beta — Dependency Audit (2026-10-11)

Scope: read-only audit of `index.html` on `main` in `randirosandi-glitch/Beta-HSK-Papers`. Stable was not accessed or modified. Runtime file SHA at audit time: `5d856ceba07ce79d3f93b588227c4ffdfa5af082` (843,951 characters; 8,153 lines).

## 1. Dependency map

### Identity and storage
- Username: `getUsername()`, `setUsernameLocal()`, `normalizeUsername()`, `validUsername()`; identity is stored under `USERNAME_KEY`.
- Per-user progress: `STORAGE_PREFIX = 'hsk4-kelas-e-progress-v4:'`; `storageKey()`, `readStore()`, `writeStore()`.
- Per-user route resume: `LAST_ROUTE_KEY = 'hsk4-kelas-e-last-route-v1'`; `window.__hskPersistRoute`, `__hskReadPersistedRoute`, `__hskClearPersistedRoute`.
- Compatibility constraint: preserve both key prefixes and existing store shape. Any future storage change needs a migration that reads old data and is tested before writing a new format.

### Answer/progress write path
1. `choose()` / `saveWriting()` / `saveWritingAnswer()` mutate in-memory `answers`, `checked`, `answerEvents`.
2. `createQuestionActivity()` appends an event to `store._attempts`, updates `store._lastActivity`, writes localStorage, and dispatches `hsk:progress-updated`.
3. `saveSectionState()` persists the per-section record under `<package>|<type>|<sectionIndex>` with `answers`, `checked`, `answerEvents`, and `updatedAt`.
4. `checkOne()` → `recordQuestionAttempt()` → `updateQuestionActivity()` updates the activity event with correctness.
5. `sectionStats()` and `packageStats()` compute displayed package/section progress primarily from per-section answer maps, not from `_attempts`.

Important: the per-section answer snapshots are the source for progress totals; `_attempts` is used for activity history and weekly/monthly/yearly analytics. The 5,000 cap does not itself cap the answer maps, but it does discard older activity events, which can make historical analytics incomplete.

### Grading path
- Original implementation: `grade(push=true)` around line 4593. It scores the active section, calls `saveSectionState()`, then `syncAfterSectionCheck()`, keeps the learner on the exercise screen, sets inline result state, and re-renders.
- Later wrapper: script `hsk-beta-grade-loading-v1-js` captures `window.grade` and replaces it with a guarded wrapper that shows the loading overlay and calls the original after a short delay. Do not remove or reorder this wrapper without tests.
- Per-question checking uses `checkOne()`; sequence questions use `isSequenceAnswerCorrect()`; multiple choice uses `correctIndex()` / `isCorrect()`.
- Grading and cloud sync are coupled through `syncAfterSectionCheck()`. Preserve the rule that the explicit section-check action is the cloud commit point unless intentionally redesigned and tested.

### Cloud sync path
- Supabase functions: `cloudFindUser()` performs a GET selecting only `data`; `cloudCreateUser()` POSTs `{username,data}`; `cloudUpdateUser()` PATCHes the full `data` JSON row.
- Login/init: `initUsernameAndCloud()` → `pullCloudState()`.
- Pull: `pullCloudStateInternal()` fetches the row, then reads local storage and merges with `mergeStoresLatest()`; it writes merged data locally but intentionally does not push from a pull.
- Commit: `grade()` → `syncAfterSectionCheck()` → `pushCloudState()`. Push reuses a cloud snapshot up to 60 seconds old when available, merges local and remote state, and skips PATCH if the merged JSON matches remote.
- Focus/visibility events call the throttled pull. `scheduleCloudSync()` and `flushCloudSync()` currently only clear the timer; despite their names, ordinary answer saves do not schedule cloud writes. This matches the explicit section-check commit design.
- Merge special cases include section answer-map merging, study-plan merge/tombstones, progress-reset tombstones, `_resume`, `_lastActivity`, and attempt-event deduplication by event ID. These are high-risk compatibility logic and should be extracted only after characterization tests exist.

## 2. Confirmed 5,000-event truncation

There are exactly three active `slice(-5000)` truncation sites in the current file:
- Line 4116: `mergeStoresLatest()` merges and deduplicates local/cloud `_attempts`, then keeps only the latest 5,000.
- Line 4556: `createQuestionActivity()` keeps only the latest 5,000 after appending.
- Line 4569: `updateQuestionActivity()` keeps only the latest 5,000 after updating.

The weekly dashboard's `attempts()` reader and `getProgressHistory()` read `_attempts`. Therefore, older activity can disappear from history and period analytics after enough events. Section/package progress remains stored separately in the per-section answer maps, so this cap is not evidence that the main answered-question count stops at 5,000.

### Recommended compatible fix (not applied in this audit)
Do not simply delete the cap without measuring localStorage/Supabase payload growth. Safer choices:
1. Preserve a bounded recent-event list for recent activity, while maintaining compact lifetime/period aggregates or a separate archive with a versioned migration.
2. If retaining every event is a firm requirement, move event history to a paginated/append-only storage model rather than repeatedly PATCHing the entire Supabase `data` blob.
3. Before changing behavior, add tests for 4,999 / 5,000 / 5,001 / 10,000 events, duplicate event IDs across local/cloud, out-of-order timestamps, edits to old events, weekly boundary aggregation, and merge after refresh/login on a second device.

Do not change the storage key, cloud schema, or attempt representation in the same patch as the first module extraction.

## 3. Extraction boundaries (proposed order)

1. **Characterization tests first:** freeze expected behavior for username isolation, section answers, grading, cloud merge, plan deletion tombstones, reset tombstones, route resume, and analytics.
2. **Storage adapter:** extract `storageKey/readStore/writeStore` with the exact existing keys and serialization.
3. **Progress model:** extract section state, activity event creation/update, statistics, and migration-safe attempt-history behavior.
4. **Cloud adapter:** extract GET/POST/PATCH and merge orchestration without changing commit timing or payload shape.
5. **Grading facade:** preserve the original `grade()` behavior and the later loading wrapper as one documented public entry point.
6. **Navigation/catalog/UI/styles:** only after the data and grading contracts are covered.

## 4. Guardrails for this rebuild

- Target is Beta `main` only; do not edit Stable.
- Keep the deployed artifact self-contained until hosting and module-loading behavior are verified.
- No storage-key/schema changes without a backward-compatible migration.
- Do not alter Reading/Listening layouts or controls as part of the storage/progress extraction.
- Preserve account identity, local/cloud progress, study plans, reset semantics, and route resume.
- Validate with a real browser/session test before claiming a fix. This document is an audit, not a runtime change.

## 5. Next implementation gate

Build a minimal regression harness against a copy of the current baseline. Start with pure-function/store fixtures for `mergeStoresLatest()`, `sectionStats()`, and attempt aggregation. Then address the 5,000-event retention design as a separate, explicitly tested change. Only after those tests pass should the first runtime module be extracted.
