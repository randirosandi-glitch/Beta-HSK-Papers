# HSK Papers Beta

This repository contains the Beta HSK Papers app and its rebuild sources. Changes here target Beta only. Keep the Stable app and the separate `Beta-HSK-Papers-Rebuild` repository out of scope.

## How the app is organized

- `index.html` is the current single-file app artifact served from the repository root.
- `src/` contains source modules embedded into marked regions of `index.html`.
- `scripts/build.mjs` synchronizes those modules into the app artifact.
- `data/` contains app data kept in this repository.
- `tests/` contains source-contract and behavior tests.
- `.github/workflows/rebuild-contracts.yml` checks module synchronization and runs the Node test suite.
- `backups/` contains a recovery snapshot. Keep it until a newer rebuild checkpoint has been verified and deliberately retained elsewhere.
- `docs/` contains the rebuild plan, progress notes, and audits.

## Safe source changes

1. Edit the owning file under `src/` for generated regions; do not hand-edit those regions in `index.html`.
2. Run `node scripts/build.mjs` to regenerate `index.html`.
3. Run `node scripts/build.mjs --check` and `node --test tests/*.test.mjs`.
4. Review the generated diff to confirm it contains only the intended change.

Some legacy app code and question data remain inline in `index.html`; check the rebuild notes before moving or removing it. Preserve account identity, local progress, cloud merge behavior, study plans, route restoration, package loading, grading, and the existing script/style order.

## Documentation

See [docs/README.md](docs/README.md) for the document index and current rebuild guardrails.
