# Rebuild documentation

These notes describe the current Beta rebuild checkpoint. They are audit records and implementation guidance, not app runtime inputs.

## Start here

- [Rebuild plan](REBUILD_PLAN_BETA_20261011.md) — target boundaries, migration order, compatibility contracts, and stop conditions.
- [Rebuild progress](REBUILD_PROGRESS_BETA_20261011.md) — extracted modules, current checkpoint, and remaining work.

## Supporting audits

- [Dependency audit](DEPENDENCY_AUDIT_BETA_20261011.md) — app data flows, dependency map, and high-risk compatibility behavior.
- [Supabase traffic audit](SUPABASE_TRAFFIC_AUDIT_BETA_20261011.md) — cloud request patterns and traffic considerations.
- [Regression checklist](../tests/regression-checklist.md) — manual release checks across account, catalog, grading, study plans, and devices.

## Current guardrails

- Work only in `randirosandi-glitch/Beta-HSK-Papers` for this task. Stable and the separate rebuild repository are out of scope.
- Keep `index.html` as the deployable artifact until deployment support for another format is verified.
- Edit extracted generated regions in `src/`, then rebuild `index.html` with `node scripts/build.mjs`.
- Preserve existing identity, storage keys and shapes, progress, cloud merge behavior, study plans, route restoration, catalog loading, grading, and visual behavior.
- Keep the recovery snapshot in `backups/` until a newer checkpoint has been verified and deliberately retained elsewhere.
- Treat source and Node tests as safeguards, then perform a focused browser regression check before a runtime migration is considered complete.
