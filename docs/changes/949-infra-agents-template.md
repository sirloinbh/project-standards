# #949 Manage the infra repo's AGENTS.md and CLAUDE.md centrally

ADR-0029 gap G1: `shared-aws-infrastructure` kept a hand-written `AGENTS.md` that repeated the common work procedure, so it could drift from the skills and from the other repos. Its `CLAUDE.md` only linked `AGENTS.md` and `AGENTS.project.md`; Claude Code loads `@` imports but does not follow markdown links (#447), so a session did not load them by itself.

## Change

| File | Content |
|---|---|
| `templates/infra/AGENTS.md.tmpl` | The repo's current `AGENTS.md`, moved here. Changed lines only: links to all six shared skills (as in the service template), the repo name from `{{target.repo}}`, the merge decision cites `project-standards#591`, and a new "Centrally managed files" section |
| `templates/infra/CLAUDE.md.tmpl` | Imports `@AGENTS.md` and `@AGENTS.project.md` |
| `scripts/test/agents.test.mjs` | The Terraform prohibitions and verification commands are still in the rendered file; `CLAUDE.md` imports both files |
| `scripts/test/sync.test.mjs`, `scripts/test/fixtures/sync-snapshot.json` | The infra target now receives `AGENTS.md` and `CLAUDE.md` |
| `docs/adr/0029-*.md`, `docs/design.md` | G1 done |

## What was decided

- No rule changed. The diff between the repo's file and the rendered template is the header, the skills sentence, the issue reference, and the added section (checked with `npm run sync:preview`).
- The verification commands stay in `AGENTS.md` (there is one infra repo, so the template can name `user-data.sh`). `AGENTS.project.md` is untouched and still wins when the two differ.

## After the merge

The sync run opens a PR in `shared-aws-infrastructure` that changes only `AGENTS.md`, `CLAUDE.md`, and the manifest. It changes no `.tf` file and runs no `terraform apply`.

## Checks

- `node --test scripts/test/agents.test.mjs scripts/test/sync.test.mjs`: passed.
- `npm run check`: passed.
