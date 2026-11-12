# #63 Automatic sync PR creation (App token, PR create and update, sync.yml)

## Change

| File | Content |
|---|---|
| `scripts/lib/github-app.mjs` | Signs the App JWT (RS256) with `node:crypto`. The installation token is issued scoped down to **one** target repo. API error messages never contain the token |
| `scripts/lib/sync-pr.mjs` | Opens or updates the sync PR of one target repo. Detailed flow below |
| `scripts/lib/pin-ranges.mjs` | Pins `^` and `~` ranges to the versions installed in the lockfile, and aligns the declarations in the root and subtree lockfiles. The installed versions do not change |
| `scripts/sync.mjs` | `--apply` mode. If `maxRollout` is 0, it only checks token issuance. It collects failures per target and reports them |
| `.github/workflows/sync.yml` | Runs on main push and manually. Skipped before the App exists (no `vars.SYNC_APP_ID`). It syncs only if the central checks pass, and runs one at a time in order |
| `templates/*/.github/workflows/ci.yml.tmpl`, `scripts/lib/vars.mjs` | Pins the CI call to `central.workflowSha` (fix below) |
| `scripts/test/sync-pr.test.mjs`, `fake-github.mjs` | 11 tests using a fake GitHub (in memory) |

## syncTarget flow

1. Read the main tree of the target repo.
2. Compare with the locally computed git blob ids and find only the changed files. The only files whose content is downloaded are those needed for merging (project section, `package.json`, lockfile, previous manifest).
3. A file that was in the previous manifest but is gone from the center is deleted only if its content is unchanged. Modified files are kept and listed in the PR body.
4. If only the manifest changed, no PR is created.
5. Create one commit with the Git Data API. The target repo is not cloned, so no hooks or scripts of the target repo run.
6. If an open sync PR exists, force-update its branch and change the title and body to the latest SHA. If not, open a new PR on `chore/standards-sync-<first 7 chars of the SHA>`. Nothing is pushed to main.
7. The PR body follows the std-git-writing PR template. The "병합 전에 확인해 주세요" section (Check before merging) includes production deploy, lockfile regeneration, `NODE_AUTH_TOKEN`, subtree push, and moving `AGENTS.project.md` only when they apply. The infrastructure repo gets a sentence saying it does not trigger an apply.
8. If there is a shared package version, check its provenance (ADR-0004): whether the tag has a Release, and whether the run in the Release body is a successful `publish.yml`. The result of the check is written in the PR body.

## Problem found by tests and fixed

When I ran the sync twice in a row, a new PR was opened every time even with no changes. The CI call was pinned to the central commit SHA being synced, so `ci.yml` in the 9 repos changed with every central commit.

I changed it to pin to the central commit that last changed the common CI (`central.workflowSha`, computed with `git log`). For this computation, `sync.yml` fetches the full history (`fetch-depth: 0`). After the fix, tests confirm two cases.

- An unrelated central commit creates no PR.
- If the common CI changes, a PR with only `ci.yml` changed is opened.

## Checks

- `npm run check`: 110 tests passed, `check-workflows: ok (7 files)`
- **Fake GitHub scenarios:**
  - First sync PR creation
  - Updating the same PR
  - No changes when re-run after merge
  - Deleting only untouched files
  - Infrastructure PR wording
  - Package provenance check
  - Token-only check when `maxRollout` is 0
  - JWT signature verification
  - Token scope, and the token is not exposed in error messages
- **Local preview:** I confirmed that the CI call is pinned to `f7b2518` (the #71 commit).
- Running on real GitHub will be verified with a manual run after the App is created (#86).
