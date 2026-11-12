# #347 Rename english-study to cert-manager

- Issue: [#347](https://github.com/sirloinbh/project-standards/issues/347)
- Decision on the app side: [sirloinbh/english-study#25](https://github.com/sirloinbh/english-study/issues/25)

## Purpose

Widen english-study from English study into a project that manages all certifications. English study stays as an area separate from certifications. When the name changes, the sync PR has to go to the new repo, so the registry values are changed, and a rename procedure that did not exist centrally is written down as a document.

## Change (2026-10-30)

| File | Content |
|---|---|
| `registry/projects.json` | Slot 06: `name` `cert-manager`, `title` and `displayName` "자격증 관리" (Certification management), `domain` "자격증" (certifications), `summary`, 4 `repos`, DB `cert`/`cert_test`, 3 `skills`. Ports unchanged |
| `sync.config.json` | Sync target `sirloinbh/cert-manager` |
| `docs/projects.md`, `scripts/test/fixtures/sync-snapshot.json` | Regenerate the generated doc and the snapshot. Only the repo name key changes in the snapshot, and the list of received files is the same |
| `scripts/test/registry.test.mjs` | Changed the retired project example to `cert-manager` |
| `docs/design.md`, `docs/tools.md`, `docs/github-app.md`, `docs/user-steps.md`, `docs/costs.md` | Fixed only tables and lists that state current values |
| `docs/project-rename.md` | Order for renaming an app (new document) |

Not fixed: `docs/bootstrap-prompt.md`, the port migration table in `docs/design.md`, `docs/research/`, the past sync PR table in `docs/user-steps.md`, and `docs/changes/` are records of their time. `docs/env-matrix.md` is regenerated every day by the compliance workflow.

## When to merge

The sync checks that the target is `sirloinbh/<repos.umbrella>`. So merge right after the GitHub repo rename ([sirloinbh/english-study#26](https://github.com/sirloinbh/english-study/issues/26), a user step) is done.

## Checks

- `npm run check`: recorded in the PR body
