---
paths:
  - "templates/**"
  - ".claude/**"
  - ".codex/**"
  - ".github/**"
  - "versions.json"
  - "registry/**"
  - "sync.config.json"
  - "docs/versions.md"
  - "docs/projects.md"
---

# Sources and copies (project-standards)

Edit the source, never the copy.

| What to change | Source | Copies (do not edit) |
|---|---|---|
| Files copied into downstream repos | `templates/common/`, `templates/app/`, `templates/infra/`, feature folders `templates/ui/`, `e2e/`, `vitest/` | Centrally managed files in downstream repos (arrive through sync PRs) |
| Shared skills | `templates/common/skills/` | This repo's `.claude/skills/` |
| Issue and PR templates | `templates/common/.github/` | This repo's `.github/` templates |
| Agent blocking settings and hooks | `templates/common/.claude/`, `templates/common/.codex/` | This repo's `.claude/settings.json`, `.claude/hooks/`, `.codex/` |
| Tool versions, external Actions, shared app dependency versions | `versions.json` | `docs/versions.md` (generated), managed fields of app `package.json` |
| Project values such as ports and DB names | `registry/projects.json` | `docs/projects.md` (generated) |
| Sync targets and rollout stages | `sync.config.json` | — |

The sync script updates only downstream repos. Copy this repo's copies from the source in the same PR. This repo's own `.claude/rules/` is not synced.
