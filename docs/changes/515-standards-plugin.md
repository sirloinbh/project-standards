# #515 Build a Claude Code plugin from the central std skills and guard hooks

ADR-0013 decides that repos outside sync (`file-control`, `develop-skill`) get the std skills and guard hooks through a plugin built from the same sources as the synced files.

## Change

| File | Content |
|---|---|
| `scripts/build-plugin.mjs` | Generates `plugins/sirloinbh-standards/` and `.claude-plugin/marketplace.json`; `--check` fails when they differ from the sources |
| `package.json` | `plugin` and `plugin:check` scripts; `check` runs `plugin:check` |
| `scripts/test/build-plugin.test.mjs` | Skills copied, templated skills skipped, hook paths rewritten, marketplace valid, committed output current, check detects stale/missing/unexpected files |
| `plugins/sirloinbh-standards/`, `.claude-plugin/marketplace.json` | Generated output (committed) |
| `docs/tools.md` | Install section |

## What was decided

- **Skills**: every `std-*` skill whose `SKILL.md` has no `{{`. `std-implementation` is skipped (`{{target.repo}}`); the plugin README lists skipped skills.
- **Hooks**: all three scripts, copied byte for byte so the template copy stays the single source. `pc-setup-notice.mjs` is included as SessionStart because it reads only user-level files.
- **`hooks/hooks.json`** is the `hooks` block of `settings.json.tmpl` with `${CLAUDE_PROJECT_DIR}/.claude/hooks/` rewritten to `${CLAUDE_PLUGIN_ROOT}/hooks/`.
- **No `version`** in the manifests, so installs follow the commit instead of staying on a cached fixed version. `claude plugin validate` warns about this; it is intentional.
- **Hook path resolution**: `block-forbidden-commands.mjs` uses the event `cwd` for commands and `CLAUDE_PROJECT_DIR` (else `cwd`) for edit paths, and imports `./block-package-installs.mjs` from its own folder. None of that depends on where the script lives, so no script change was needed.
- **Not synced**: `sync.mjs` copies only `templates/`, so `plugins/` and `.claude-plugin/` do not reach app repos. No `.prettierignore` exists in this repo, so no entry is needed.

## Checks

- `claude plugin validate plugins/sirloinbh-standards` and `claude plugin validate .`: passed. Warnings: no `version` (intentional), and advice to add an install line to the README (added).
- Ran the plugin copy of `block-forbidden-commands.mjs` with an event: `git push origin main` exits 2, `git status` exits 0.
- `npm run check`: see the PR.
