# 0013. Claude Code plugin only for repos outside sync; file sync stays for synced repos

- Status: Proposed (issue #451)
- Date: 2026-11-14

## Context

- The central repo copies the shared harness to 9 repos (`sync.config.json`): std skills, guard hooks, permission settings, `AGENTS.md`, CI checks, and configs. `file-control` and `develop-skill` are not sync targets, so they get none of it.
- A Claude Code plugin can ship skills, agents, hooks, MCP and LSP servers, output styles, and executables from one marketplace repo. Research for #451 checked the official docs (plugins, marketplaces, loading, hooks, skills, sub-agents, settings, headless, cloud sessions, GitHub Actions) and the central code. The findings that decide this ADR:

| Topic | Finding |
|---|---|
| What a plugin cannot ship | `CLAUDE.md` (a plugin's root `CLAUDE.md` is not loaded), `.claude/rules/`, and permission rules or other `settings.json` keys (no such component is documented) |
| Same skill in plugin and repo | Plugin skills are namespaced (`/plugin:skill`), so both load and both use the skill-list budget. Nothing shadows anything |
| Same hook in plugin and repo | Both run, in parallel. A plugin's copy is not de-duplicated with a settings copy. A single plugin hook cannot be turned off, only the whole plugin |
| Turning it on per repo | A committed `.claude/settings.json` can declare `extraKnownMarketplaces` and `enabledPlugins`, but only after the folder is trusted, and each machine must still run `claude plugin install` once. A local setting can turn the plugin off |
| Headless `claude -p` | Loads only plugins already installed on that machine. A plugin enabled only in repo settings is not installed by `-p` |
| Cloud sessions | Do not load plugins that the repo declares. Committed skills and hooks do load |
| Missing plugin | No error. Its skills and hooks are simply absent (shown only in the `/plugin` Errors tab) |
| Private marketplace | Uses the machine's git credentials (`gh auth setup-git`). There is no token field |
| Versions | A `ref` or `sha` pins the source. A fixed `version` keeps users on the cached copy until it changes. Auto-update is off by default for personal marketplaces |
| Offline | Installed plugins load from `~/.claude/plugins/cache/` without network |
| Codex | Reads `AGENTS.md`, `.codex/hooks.json`, `.codex/rules/`, and skills from `.agents/skills`. It has its own plugin format (`.codex-plugin/plugin.json`), not yet checked in detail. The `SKILL.md` format is the same |
| Central code | The local workers in `tools/agents` run Codex and read `skills/` as files. `.codex/hooks.json` imports `.claude/hooks/block-package-installs.mjs` from the repo |

## Decision

1. **Synced repos keep file sync for everything.** Guard hooks, std skills, permission settings, `AGENTS.md`, rules, CI, and configs stay as committed files. Reasons:
   - A guard hook that silently fails to load gives no protection. Committed hooks load in interactive, headless, and cloud sessions without an install step.
   - The Codex workers and `.codex/hooks.json` need the files in the repo.
   - Each change still arrives as a reviewable sync PR in each repo.
2. **Synced repos do not enable the plugin.** Enabling it next to the synced copies would load every skill twice and run every hook twice.
3. **Repos outside sync use a plugin.** This repo builds a plugin (`sirloinbh-standards`) and a marketplace file from the same sources (`templates/common/skills/std-*`, `templates/common/.claude/hooks/*.mjs`). There is one source and two delivery channels. `file-control` and `develop-skill` enable it in their `.claude/settings.json`, and the user installs it once per PC.
   - Only content without per-repo values goes into the plugin. Skills that need repo values (for example `std-implementation` with `{{target.repo}}`, or the app-only skills) are left out or rewritten to read the value at run time.
   - Permission rules cannot ship in a plugin. Those two repos keep their own `.claude/settings.json` permissions.
4. **Codex is unchanged.** It keeps `AGENTS.md`, `.codex/` files, and skill files. A Codex plugin is looked at again in #517.

| Item | Synced repos (9) | `file-control`, `develop-skill` |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `.claude/rules/` | Sync | Repo's own files |
| std skills | Sync (`skills/`, `.claude/skills/`) | Plugin |
| Guard hooks | Sync (`.claude/hooks/`, `settings.json` `hooks`) | Plugin |
| Permission rules | Sync (`settings.json`) | Repo's own `settings.json` |
| CI, `.standards/`, configs | Sync | Not covered |
| Codex | Sync (`.codex/`, `skills/`) | Not covered |

## Consequences

- Synced repos see no change. There is no migration and no risk to workers, cloud sessions, or CI.
- `npm run check` must also verify that the generated plugin matches its sources, so the two channels cannot drift (#515).
- The two outside repos get the std skills and guard hooks as `/sirloinbh-standards:std-*`. If the plugin is not installed on a PC, they silently run without them, so the install step goes into `docs/tools.md` (#516).
- Hook scripts must work from `${CLAUDE_PLUGIN_ROOT}` as well as from `.claude/hooks/`. The current scripts use only Node built-ins and `CLAUDE_PROJECT_DIR` or the event `cwd`, so no change is expected.

## Follow-up work

- #515 Build the plugin and marketplace file from the central sources, with a freshness check.
- #516 Enable the plugin in `file-control` and `develop-skill`, and document the install step.
- #517 Revisit plugins for synced repos once headless and cloud sessions load repo-declared plugins, and check the Codex plugin format.
