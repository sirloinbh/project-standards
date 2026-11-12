# #497 Add a shared code review skill (std-code-review)

The shared standards covered writing PRs (`std-git-writing`) and who merges (`AGENTS.md`), but not how to review a PR. The new shared skill `std-code-review` fills that gap for this repo and every app repo.

## Changes

| File | Change |
|---|---|
| `templates/common/skills/std-code-review/SKILL.md` | New shared skill: the "approve once it improves code health" standard (Google engineering practices), what to read before the code (PR body sections, issue "Done when", CI, PR size), the ordered checklist, Conventional Comments labels and decorations with examples, tone, review speed, the decision table, merge rules, and author guidance |
| `.claude/skills/std-code-review/SKILL.md` | Copy of the source |
| `templates/common/skills/std-git-writing/SKILL.md` (copy: `.claude/skills/`) | Section 5 links to the new skill |
| `AGENTS.md` | "Work procedure" points to the skill for PR reviews, sync PRs included |
| `templates/app/AGENTS.md.tmpl` | Same pointer, and the skill is in the shared skill list |
| `scripts/test/agents.test.mjs` | App repos must receive the new skill and its `.claude/skills` copy |
| `scripts/test/fixtures/sync-snapshot.json` | Snapshot lists `skills/std-code-review/SKILL.md` and `.claude/skills/std-code-review/SKILL.md` for each app |

## Decisions

- Adapted from a generic draft (Google eng-practices and Conventional Comments) to these repos:
  - English only.
  - The review starts from the std-git-writing PR body sections and the issue's "Done when".
  - Who merges stays with `AGENTS.md`; a review never replaces it. "Check before merging" items that need the user's judgment still stop the merge.
  - Merge commits, not squash, so the squash-merge advice was dropped. No `--delete-branch`.
  - The agent and the user share the `sirloinbh` account, and GitHub does not allow approving your own PR, so the review is recorded as a comment that starts with the decision.
  - `chore:` (for example a missing change record or snapshot update) blocks merging.
- The draft linked a style guide; the skill instead says style is settled by the formatter, the linter, and the repo's conventions, because app repos do not receive `docs/conventions/`.

## Verification

- `UPDATE_SNAPSHOT=1 npm test`: 537 passed, 0 failed, 5 skipped. Snapshot diff: only the two new skill paths, once per app.
- `npm run sync:preview`: the rendered skill has one "Managed file" header line.
- `npm run check`: passed.
