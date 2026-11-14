<!-- Generated file. Edit the sources in sirloinbh/project-standards and regenerate with `npm run plugin`. -->
# sirloinbh-standards plugin

The std skills and guard hooks of `sirloinbh/project-standards`, for repos that are **not** sync targets (`file-control`, `develop-skill`). Do not enable it in synced repos: they already have the same skills and hooks as files, and both copies would load (ADR-0013).

## Install

```
claude plugin marketplace add sirloinbh/project-standards
claude plugin install sirloinbh-standards@sirloinbh-standards --scope project
```

## Skills

- `/sirloinbh-standards:std-backlog`
- `/sirloinbh-standards:std-code-review`
- `/sirloinbh-standards:std-communication`
- `/sirloinbh-standards:std-git-writing`
- `/sirloinbh-standards:std-session-notes`

## Skipped skills

These skills contain `{{` template variables that are filled in per repo, so they are not in the plugin.

- `std-implementation`

## Hooks

- `hooks/block-forbidden-commands.mjs`
- `hooks/block-package-installs.mjs`
- `hooks/pc-setup-notice.mjs`

`hooks/hooks.json` is the `hooks` block of `templates/common/.claude/settings.json.tmpl`, with `${CLAUDE_PROJECT_DIR}/.claude/hooks/` rewritten to `${CLAUDE_PLUGIN_ROOT}/hooks/`.

Permission rules, `AGENTS.md`, and `.claude/rules/` cannot ship in a plugin. Each repo keeps its own.
