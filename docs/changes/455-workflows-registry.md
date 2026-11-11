# 455: Translate workflows and registry schemas to English

Part of #455.

## What changed

- Translated comments, step names, descriptions, and warning messages in `.github/workflows/*.yml`.
- Translated `title`, `description` texts in `registry/projects.schema.json` and `registry/platform.schema.json`.
- Translated the `allowedDifferences` reason in `registry/projects.json`.
- Release body headings in `publish.yml` are now English (`## Changes`, `## Release record`, `- Package:`, `- Commit:`).

## Kept as is

- `- 배포 실행:` in `publish.yml`: `scripts/lib/sync-pr.mjs` parses it. It is migrated separately.
- `domain` values in `registry/projects.json`: they stay Korean by decision.

## Verification

- `grep -nP '[\x{AC00}-\x{D7A3}]'` over the group shows only the two items above.
- `npm run check` run in the worktree.
