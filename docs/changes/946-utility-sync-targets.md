# #946 Add develop-skill and file-control as utility sync targets

[ADR-0029](../adr/0029-standards-delivery-per-repo-group.md): the two utility repos receive the shared agent files through sync PRs instead of the plugin. The user installed the GitHub App on both repos on 2026-11-21 (#945).

## Change

| File | Content |
|---|---|
| `sync.config.json` | Two new targets with the `utility` profile and `project: null`. No existing target changed |
| `scripts/test/fixtures/sync-snapshot.json` | The 37 managed files each utility receives (the manifest is the 38th file in the sync PR) |
| `scripts/test/sync.test.mjs` | 13 targets; the dry run writes the shared skills for both utilities and no `AGENTS.md` or workflow |
| `docs/github-app.md`, `docs/repo-settings.md`, `README.md`, `docs/tools.md` | Repo lists and counts |

## What each utility receives

All shared skills (with `orca-lanes`) and their `.claude/skills/` copies, the 3 guard hooks, `.claude/settings.json`, `.codex/`, the issue and PR templates, `.editorconfig`, `.gitattributes`, the central section of `.gitignore`, `.vscode/settings.json`, and `.standards/`. The issue labels are applied by the same sync run. It receives no `AGENTS.md`, `CLAUDE.md`, CI workflow, tool version file, package, or deploy file.

## After the merge

- The `sync` run opens the first sync PR in each repo. Those PRs are reviewed and merged in #947 (move `develop-skill`'s turned-off plugins to local settings first, add the check step to each repo's CI).
- If the App were missing on a repo, that target would fail and the run would end as failed; the run is checked for #945.
- The compliance report and the repo settings baseline start covering both repos.

## Checks

- `UPDATE_SNAPSHOT=1 node --test scripts/test/sync.test.mjs`, then `npm run check`: passed.
- `npm run sync:preview`: read the two folders.
