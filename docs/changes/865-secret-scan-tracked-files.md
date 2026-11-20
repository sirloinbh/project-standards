# #865 secret-scan checks tracked files under build-output folders

## Change

| File | Content |
|---|---|
| `scripts/secret-scan.mjs` | `listFiles` returns every tracked file in a git repository. `SKIP_DIRS` applies only to the folder-walk fallback (no `.git`) |
| `scripts/test/secret-scan.test.mjs` | A tracked file under `dist/` with a token is reported, an untracked one under `coverage/` is not; outside git the walk still skips build output |

## Why

`git ls-files` already lists only what would be pushed, so filtering it by `SKIP_DIRS` only hid committed files. A GitHub token force-added as `dist/leak.txt` gave "no suspicious items".

## Checks

- The 8 app clones at their `origin/main` pass the new scan.
- `npm run check`: see the PR.
