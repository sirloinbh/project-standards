# #948 Retire the sirloinbh-standards plugin

[ADR-0029](../adr/0029-standards-delivery-per-repo-group.md) decision 4 (user choice 2A, 2026-11-21): sync is the only delivery channel. `develop-skill` and `file-control` merged their first sync PR (`develop-skill#41`, `file-control#333`, tracked in #947) and their `.claude/settings.json` no longer enables the plugin, so nothing uses it.

## Change

| File | Content |
|---|---|
| `plugins/sirloinbh-standards/`, `.claude-plugin/marketplace.json` | Removed (generated files) |
| `scripts/build-plugin.mjs`, `scripts/test/build-plugin.test.mjs` | Removed |
| `package.json` | The `plugin` and `plugin:check` scripts are gone from `check` and `check:docs` |
| `docs/tools.md` | The plugin section now says it is retired and gives the uninstall commands |
| `docs/adr/0013-plugin-for-repos-outside-sync.md` | Status line: decision 3 superseded by ADR-0029 |
| `docs/adr/0029-*.md`, `docs/design.md` | State after the rollout |
| `docs/user-steps.md` | New user step: uninstall the plugin on each PC |

## Not changed

- The guard hooks still resolve their own path through a link (`block-package-installs.mjs`); that also covers Orca's profile folders, so the code and its test stay.
- The plugin can be rebuilt from git history (`scripts/build-plugin.mjs` before this commit) if a repo outside sync ever needs it.

## User step

On each PC that installed it: `claude plugin uninstall sirloinbh-standards@sirloinbh-standards`, then `claude plugin marketplace remove sirloinbh-standards`. Until then the cached plugin is simply not enabled by any repo.

## Checks

- `npm run check`: passed.
