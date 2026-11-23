# #1056 Comment the downstream file changes on each central PR

- Issue: [#1056](https://github.com/sirloinbh/project-standards/issues/1056), epic #1050
- Branch: `feat/1056-downstream-diff`

## Changes — 2026-11-23

- `scripts/downstream-diff.mjs`: runs `sync.mjs --dry-run` of a base checkout and a head checkout with the same fixed commit id (so the commit id and the CI pin never count as changes), compares the two result folders per repo, renders a short table plus a per-repo file list (8 files shown, then "and N more"), and creates, updates in place, or deletes one PR comment (marker `<!-- downstream-diff -->`). No comment when nothing downstream changes.
- `.github/workflows/ci.yml`: new job `downstream-diff` for pull requests from this repo only (not forks). It is the only job with `pull-requests: write`; it checks out the base and the head side by side.
- Docs: `.claude/rules/sync-and-deploy.md`, `docs/design.md` 5.3.

## Verification

- `node --test scripts/test/downstream-diff.test.mjs`: 3 passed (added, changed and removed files; skipped unchanged repos; cap; create, update, unchanged, delete).
- Local run with a template edit in the head: 13 repos listed with the changed files. With identical base and head: "No downstream file changes."
- The comment on a real PR appears when this PR's CI runs (base has no such job, so the first real example is the next central PR).
