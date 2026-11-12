# #259 Secret leak scan in CI that finds committed tokens and keys

## Decision

Instead of an external tool (such as gitleaks), we made `scripts/secret-scan.mjs`, which uses only Node built-in modules. Like `ioc-scan.mjs`, it is copied to downstream repos as `.standards/secret-scan.mjs`.

- No new binary or Action is brought in, so there is no supply chain risk or version pinning burden.
- It checks only low false-positive shapes (tokens and keys with fixed prefixes, private key blocks, committed `.env` files) and fails right away when it finds one.
- A broader provider list is left to GitHub secret scanning (#260, #261).

## Change

| File | Content |
|---|---|
| `scripts/secret-scan.mjs` | Scans the files to be committed (`git ls-files` in git), and `--history` scans the history of all branches. Values are not printed. `secret-scan:allow` line exception |
| `scripts/test/secret-scan.test.mjs` | 11 rules, false-positive examples, exception marks, `.env`, scanning only tracked files, history scan, exit codes, and the CI wiring check (8 tests) |
| `templates/index.json`, `scripts/test/fixtures/sync-snapshot.json` | App and infra repos receive `.standards/secret-scan.mjs` |
| `.github/workflows/ci.yml`, `reusable-app-ci.yml`, `reusable-infra-ci.yml` | Run the scan before installing dependencies |
| `package.json` | Added `secrets:check` to `npm run check` |
| `docs/env-conventions.md` | A "Committed secret scan" section |

## History scan of 11 repos (2026-10-27)

We scanned the history of all branches of 11 repos downloaded with `git clone --mirror` (project-standards, shared-aws-infrastructure, 8 apps, file-control) using `scanHistory`. **0 findings.** The subtree deploy repos (`*-frontend`, `*-backend`, `*-db`) are part of the umbrella repo history, so they were not scanned separately.

## Verification

- `node --test scripts/test/secret-scan.test.mjs`: 8 passed
- `UPDATE_SNAPSHOT=1 npm test`: 422 of 423 passed, 1 skipped, 0 failed
- `npm run check`: see the PR body below
