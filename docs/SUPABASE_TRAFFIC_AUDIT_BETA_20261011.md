# Supabase Traffic Audit — Beta (2026-10-11)

## Scope and safety

- Repository: `randirosandi-glitch/Beta-HSK-Papers`
- Scope: Beta only; the separate rebuild repository is untouched.
- Runtime file: `index.html`, synchronized from the tracked source modules.
- This is a source-code audit. Supabase dashboard metrics are not connected, so the exact egress source and measured savings are unknown.

## Current behavior

- Learner progress is written to browser local storage immediately.
- The first unsynced local change starts a 12-hour pending window. Later changes join the same batch and do not restart the clock.
- When the pending batch is at least 12 hours old, an online app session can merge it with the latest cloud state and push it. If the app is closed or offline, it waits until a later active/online session.
- Cloud pulls are limited to once per 12 hours for each username on each device. The first pull on a device remains available immediately so existing cloud progress can load.
- A due push can fetch the latest remote state before updating it when the cached snapshot is stale. This protects the existing cross-device merge behavior.
- Successful writes still use `Prefer: return=minimal`, so they do not return the full database row.

## Egress impact

The monthly and yearly dashboard summaries were calculated in the browser from locally stored attempt history. Removing those calculations reduces page code and local work, but by itself it does not materially reduce Supabase egress.

The 12-hour local-first batch is the part expected to reduce Supabase traffic: it limits repeat cloud reads and combines multiple progress changes into fewer sync cycles. Exact egress savings cannot be guaranteed from source inspection alone. Each due sync may still read the full progress `data` column, and a larger accumulated progress record can make that response larger. Confirm the change against Supabase Usage and request logs over comparable time windows.

## Trade-offs

- Progress remains on the current device until its batch syncs. Clearing browser storage or losing the device before the next successful sync can lose that unsynced batch.
- Updates made on another device may take up to 12 hours to appear on this device, depending on when its last successful pull occurred.
- An app that stays closed or offline beyond the 12-hour mark syncs when opened or brought online later; it does not run a background job.

## Verification

- [ ] First login on a device loads the existing cloud progress.
- [ ] Reopening or focusing the app before 12 hours does not cause repeated cloud pulls.
- [ ] Answer and grading changes appear in local storage immediately and remain queued before 12 hours.
- [ ] Later local edits join the original pending window rather than restarting it.
- [ ] At the 12-hour boundary, an online foreground session merges and uploads the local batch.
- [ ] A due batch remains queued while offline and syncs after connectivity returns.
- [ ] Two devices retain disjoint progress and merge it after their eligible syncs.
- [ ] Account test continues to make no Supabase requests.
- [ ] Compare Supabase Egress and request counts before and after using the same observation window.

## Dashboard follow-up

In Supabase Usage, inspect egress by service (Database, Storage, Auth, Realtime, and other enabled services) and compare it with request/log counts. If Database Egress is not the dominant source, investigate the service responsible before making further sync changes.
