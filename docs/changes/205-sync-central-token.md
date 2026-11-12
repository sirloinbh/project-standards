# #205 Fix the 403 error when sync checks package publishing

## Problem

The first `sync` run after `maxRollout` 1 (PR #204) failed in workout-memo with `GET /repos/sirloinbh/project-standards/actions/runs/40088716697 failed: 403 Resource not accessible by integration`. `verifyPackages` (ADR-0004) reads the `publish.yml` run named in the shared package Release, and it used the App installation token for this request. The App permission table has no Actions permission. A package version first became non-`null` in #88 (PR #200), so this code had not run before then.

## Change

| File | Content |
|---|---|
| `.github/workflows/sync.yml` | Added `actions: read` to the workflow permissions and passed `GITHUB_TOKEN` to the sync step |
| `scripts/sync.mjs` | Reads of the central repo (Release, publish run) use `centralToken` (`GITHUB_TOKEN`). The App token is issued only for downstream repos. Fails immediately if `GITHUB_TOKEN` is missing |
| `scripts/test/sync-pr.test.mjs` | Checks that central reads use `centralToken` and the App token is issued only for target repos |
| `docs/github-app.md` | Why the Actions permission is not granted |

## Decisions

- Did not add Actions read to the App permissions. It would create a user step (permission change and Accept) and let the App read the run history of the 9 downstream repos. The central repo is the workflow's own repo, so `GITHUB_TOKEN` is enough.
- The behavior of only checking App installation token issuance when `maxRollout` is 0 is unchanged.

## Verification

- `node --test scripts/test/sync-pr.test.mjs`: 12 passed.
- `npm run check`: 402 of 404 tests passed, 2 skipped.
- The `sync` run result after merging will be recorded in #205.
