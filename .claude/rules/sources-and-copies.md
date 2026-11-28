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
| Files copied into downstream repos | `templates/common/`, `templates/app/`, `templates/infra/`, feature folders `templates/ui/` (only `sign-in.tsx` and the service worker files; the UI kit, tokens and design docs have their source in the pinned `sirloinbh/design-system` release, ADR-0031), `e2e/`, `vitest/` | Centrally managed files in downstream repos (arrive through sync PRs) |
| Shared skills | `templates/common/skills/` | This repo's `.claude/skills/` |
| Issue and PR templates | `templates/common/.github/` | This repo's `.github/` templates |
| Agent blocking settings and hooks | `templates/common/.claude/`, `templates/common/.codex/` | This repo's `.claude/settings.json`, `.claude/hooks/`, `.codex/` |
| Tool versions, external Actions, shared app dependency versions | `versions.json` | `docs/versions.md` (generated), managed fields of app `package.json` |
| Project values such as ports and DB names | `registry/projects.json` | `docs/projects.md` (generated) |
| Editor config (`.editorconfig`, `.vscode/settings.json`) | `templates/common/.editorconfig.tmpl`, `templates/common/.vscode/settings.json.tmpl` | This repo's `.editorconfig`, `.vscode/settings.json` (`.gitattributes` is this repo's own: it adds a `*.cmd` line) |
| Sync targets | `sync.config.json` | — |

The sync script updates only downstream repos. Run `npm run self` to write this repo's own copies of the skills, hooks, Codex files, GitHub templates, and editor config from the source; `npm run check` fails (`self:check`) when a copy differs. This repo's own `.claude/rules/` is not synced.
