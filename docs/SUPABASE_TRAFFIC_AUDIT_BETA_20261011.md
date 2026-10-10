# Supabase Traffic Audit — Beta (2026-10-11)

## Scope and safety

- Repository: `randirosandi-glitch/Beta-HSK-Papers`
- Branch: `main` (Beta only)
- Runtime file: `index.html`
- Stable was not modified.
- This is a source-code traffic audit. Supabase dashboard metrics were not accessible through the connected tools, so the actual service-level egress source remains unconfirmed.

## Findings from the source

1. The app stores learner progress in local storage and uses Supabase table `namasiswa`, column `data`, for cloud sync.
2. `cloudFindUser()` issues a GET selecting only `data`. That response can grow with the user's saved progress.
3. `cloudCreateUser()` and `cloudUpdateUser()` use `Prefer: return=minimal`, avoiding a full database row in successful write responses. This is already a good egress-saving measure.
4. `pullCloudState()` is called on both `visibilitychange` to visible and window focus. Previously, the shared throttle was only 60 seconds, so returning to the app could trigger repeated full `data` downloads.
5. `pushCloudState()` can reuse a recent remote snapshot and skips PATCH if the merged JSON is identical. However, the remote snapshot freshness window was only 60 seconds, allowing more GETs during long sessions.
6. Failed pushes set a pending flag and the `finally` block retried after 1.5 seconds without a retry limit. Persistent failures could therefore create repeated network requests.

## Runtime changes applied

- Increase the shared automatic cloud-pull cooldown from 60 seconds to 15 minutes. A forced pull during login/recovery still bypasses this cooldown.
- Increase the reusable remote-snapshot freshness window from 60 seconds to 15 minutes. This reduces GET-before-PATCH lookups during a session.
- Bound automatic retries to at most three scheduled retries, with 5s, 10s, and 20s delays. A successful push resets the retry counter. This prevents an unbounded rapid retry loop when Supabase is unavailable.
- Preserve local-first writes, existing user keys, cloud table/column, merge functions, and minimal write responses.

## Trade-off

Cross-device changes may take longer to appear automatically—up to the 15-minute refresh window in ordinary foreground/background activity. Login still forces a pull, and a stale snapshot is refreshed before a cloud write. This is an intentional trade-off for the user's stated priority of minimizing traffic. It does not guarantee that egress will fall below quota, because the dashboard's per-service breakdown is not yet known.

## Verification checklist

- [ ] Log in on a device with existing cloud progress; verify the progress is loaded.
- [ ] Navigate between screens and switch app focus repeatedly; confirm there is no more than one ordinary cloud pull per 15-minute cooldown.
- [ ] Check a section twice with no new local changes; verify identical snapshots do not trigger a PATCH.
- [ ] Change an answer and check the section; verify local progress persists and cloud sync succeeds.
- [ ] Simulate offline/cloud failure; verify retries are bounded and local progress remains.
- [ ] Restore network and trigger a manual user action/section check; verify sync can recover.
- [ ] Test two devices with distinct section progress and confirm merge behavior after refresh/login.
- [ ] Confirm username identity, study plans, reset behavior, and account `test` exclusions remain intact.
- [ ] Compare Supabase Egress and request counts before/after using the same observation window.

## Dashboard follow-up needed

In Supabase Usage, inspect the egress breakdown by service (Database, Storage, Auth, Realtime, and any other enabled services) and compare it with request/log counts. If Database Egress is not the dominant source, do not assume this code change addresses the primary cause; investigate the service responsible before further architecture changes.
