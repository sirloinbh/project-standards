# #187 Reflect progress status and the recommended order in the user steps doc

## Change

| File | Content |
|---|---|
| `docs/user-steps.md` | In the step table: a status column as of 2026-10-23, the recommended order (1 → 2 → 3 → 4) with reasons, and a table of what the agent does next when each step is done. Added sections for 7 (#180 trust the Codex hook) and 8 (#183 PC check). In 2-3, the backup folder name uses the run date. The date of the 2-1 fast-forward recheck |

## How we checked the status (read-only)

- #21: `%LOCALAPPDATA%\sirloinbh-tools` does not exist
- #92: `shared-aws-infrastructure` main `b4cafc1` is an ancestor of `684542a`, the result of workout-memo `git subtree split` (`git merge-base --is-ancestor`), a 3-commit difference. `workout-memo\infrastructure\terraform.tfstate` exists, `$HOME\Backups` does not
- #86: `variable list` and `secret list` returned nothing
- #88: `git ls-remote --tags origin` and `release list` returned nothing
- #22: the workout-memo `vulnerability-alerts` API says "disabled" (404)
- #183: `claude --version` 2.1.309

## Verification

- `npm run check` passed (all 392 tests passed)
