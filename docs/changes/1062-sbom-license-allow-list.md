# #1062 Add an SBOM and a license allow list for app dependencies

- Issue: [#1062](https://github.com/sirloinbh/project-standards/issues/1062)
- Branch: `feat/1062-sbom-license-allow-list`
- Parent: #1052

## Changes — 2026-11-23

- `scripts/license-check.mjs` (Node built-ins only) reads `package-lock.json`, and reports every package whose license is not on the allow list. SPDX expressions are understood (`OR`, `AND`, `WITH`), legacy `licenses` arrays and objects are read, a package with no license is reported as "none declared", and own `@sirloinbh/*` packages are skipped. It only warns by default (`::warning` annotations in GitHub Actions) and exits 0; `--strict` exits 1.
- Allow list: `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `BlueOak-1.0.0` (from the issue) plus `CC0-1.0`, `Unlicense`, `Python-2.0`, `CC-BY-4.0` (permissive licenses common in npm trees; added so the first run is not noise). It is written in `docs/dependency-policy.md` ("Licenses") with what to do for other licenses; a test keeps the script and the document equal.
- The script is vendored to apps as `.standards/license-check.mjs` (profile `app`, one line in `templates/index.json`; sync snapshot regenerated: 8 apps).
- `reusable-app-ci.yml` (verify job): runs the license check after `npm ci`, then `npm sbom --package-lock-only --sbom-format cyclonedx` and keeps `sbom.cdx.json` as the workflow artifact `sbom` for 30 days. Neither step fails CI.

Later decision (left open by the issue): switch the license step to `--strict` once the apps are clean.

## Verification

- `node --test scripts/test/license-check.test.mjs`: 7 passed (a GPL dependency is reported, SPDX expressions, legacy forms, warn vs `--strict`, annotations, policy equals script list, CI step present).
- `UPDATE_SNAPSHOT=1 npm test`: 643 passed. `npm run check`: see the PR.
- First CI run in an app confirms the `sbom` artifact (see the PR).
