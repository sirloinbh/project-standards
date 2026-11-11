# #455 Translate the leftover header lines and markers

Follow-up after the six #455 translation PRs and #478.

## Changes

- The four hook and rule sources that carry their own header line (`block-package-installs.mjs`, `pc-setup-notice.mjs`, `git-branch.rules`, `package-installs.rules`, and their copies under `.claude/` and `.codex/`) now use the English header. Sync keeps an existing header, so these stayed Korean after #478.
- `publish.yml`: the release body line is `- Deploy run: <url>`. `sync-pr.mjs` reads only the run URL, so old releases still work.
- `AGENTS.md`, `std-git-writing` (template and copy), and `templates/app/AGENTS.md.tmpl` name the new English sync commit prefix and header, and mention the old Korean forms.

## Korean left on purpose

- `LEGACY_HEADER_TEXT` in `scripts/lib/render.mjs` and `OLD_COMMIT_PREFIX` in `scripts/lib/sync-pr.mjs`, so files and sync PRs from before #455 are still recognized.
- Regexes that match Korean input: `tools/labels.mjs` (old label names), `tools/dependency-prs.mjs` and `tools/labels.mjs` (yes/no answers), `tools/agents/workflow.mjs` (the old "Done when" heading).
- `[직접]` in `AGENTS.md`: older issue titles use it.
- `packages/*` READMEs and changelogs: changing them needs a package release (a user step).

## Verification

- `npm run check`: pass.
