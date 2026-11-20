# #944 Add the utility sync profile

First implementation step of [ADR-0029](../adr/0029-standards-delivery-per-repo-group.md): the profile the two utility repos (`develop-skill`, `file-control`) will use. No target is added yet (#946, after the GitHub App is installed on them, #945), so no downstream repo changes with this PR.

## Change

| File | Content |
|---|---|
| `sync.config.json` | New profile `utility`: `templates: ["common"]`, no packages, no `neverTouch`, no `ci` |
| `sync.config.schema.json` | `ci` is optional in a profile. No script reads it; a utility keeps its own CI workflow |
| `scripts/lib/sync-pr.mjs` | On a repo's first sync, when `.claude/settings.json` already existed, the PR body's "Check before merging" asks to move the repo's own settings (for example turned-off plugins) to `.claude/settings.local.json` or user settings first |
| `scripts/test/utility-profile.test.mjs` | A utility target gets the shared skills (with `orca-lanes`), hooks, settings, Codex files, GitHub templates, and `.standards/`; no `AGENTS.md`, `CLAUDE.md`, CI workflow, tool versions, deploy or app files; `standards-check` passes on the result and fails after a local edit; the PR body notice |

## Checks

- `node --test scripts/test/utility-profile.test.mjs`: passed.
- `npm run check`: passed.
