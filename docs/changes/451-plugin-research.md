# #451 Research packaging the harness as a Claude Code plugin

- Issue: [#451](https://github.com/sirloinbh/project-standards/issues/451)
- Branch: `docs/451-plugin-adr`
- Date: 2026-11-14 (Asia/Seoul)

## Problem

Repos outside sync (`file-control`, `develop-skill`) do not get the shared skills and guard hooks. The issue asked whether a Claude Code plugin should deliver them, for those repos and for the synced repos too.

## Research

Six agents worked in parallel:

- what in `templates/` could move to a plugin;
- plugin format and distribution;
- precedence and double loading;
- headless, cloud, and CI behavior;
- Codex;
- what the sync machinery would need to change.

The findings that decide the question are in the Context table of [ADR-0013](../adr/0013-plugin-for-repos-outside-sync.md).

## Change

- Added `docs/adr/0013-plugin-for-repos-outside-sync.md` (Proposed). Synced repos keep file sync. A plugin built from the same sources is used only by repos outside sync.
- Registered the follow-up issues under #451: #515 (build the plugin), #516 (enable it in the two repos), and #517 (revisit later).

## Checks

- `npm run check`: see the PR.
