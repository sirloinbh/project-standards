# #375 Allow npm ci for agents

- Issue: [#375](https://github.com/sirloinbh/project-standards/issues/375)
- Branch: `feat/375-allow-npm-ci`

## Purpose

When a working folder had no `node_modules`, the agent could not run `npm run check`. An app cannot lift the deny list and the hook, so the user decided to allow it centrally (2026-11-01).

## Change (2026-11-01)

- Removed `npm ci` and its aliases from the deny list, the hook, and the Codex rules. Other install commands such as `npm install` stay blocked.
- The aliases behave the same, so they were lifted together. Blocking only the aliases would conflict with the check that "a word in the list is also blocked by the hook".
- The hook blocks an `npm ci` that has an option that turns install scripts on (including short forms) or an environment variable in the same command. This is because it would undo `ignore-scripts=true` from `.npmrc` in a single command.
- `tools/repos.mjs run` keeps denying `npm ci`. This allowance is for running checks in one working folder, and when a supply chain attack is in progress the impact must not spread to all repos. Added `findAnyInstall` to the hook.
- Fixed the app `AGENTS.md` template, the Dev Container compose template, `docs/agent-guardrails.md`, `docs/dependency-policy.md`, `docs/tools.md`, `docs/test-config.md`, and `docs/bootstrap-prompt.md`.

## Limits

- The deny list and the Codex rules compare only words and cannot see options. Only the hook blocks options and environment variables that turn scripts on. A Codex hook runs only when trusted and does not block when it fails.
- The hook looks at one command only. It cannot block an environment variable set in an earlier command or an edit of `.npmrc`.
- Running `npm ci` on a branch where the lock file changed can install versions that have not been reviewed yet. This was accepted as the risk that comes with this allowance.
- Hook settings are read when a session starts. They apply from a new session after the sync reaches the app.

## Checks

- `npm run check`: passed (503 passed, 18 skipped, 0 failed).
- There is no Codex CLI, so the real decision test of the Codex rules was skipped.
