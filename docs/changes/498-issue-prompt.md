# #498 Add a copy-paste prompt for writing issue cards outside Claude Code

Inside Claude Code, `std-backlog` and `std-git-writing` guide issue writing, but another AI chat (for example claude.ai) does not see them. `docs/issue-prompt.md` holds a copy-paste prompt that applies the same rules there.

## Changes

| File | Change |
|---|---|
| `docs/issue-prompt.md` | New: when to use the prompt, the prompt itself, the steps after getting an answer (duplicate search, `ghp issue create --body-file`, sub-issue link), and an example |
| `docs/git-conventions.md` | Links to the prompt and to the new `std-code-review` skill (#497) |
| `README.md` | The rule document list links to the prompt |

## Decisions

- The prompt was rewritten from a generic draft to match the repo rules:
  - Titles have no prefix (the draft used `[Bug]:`), are imperative, about 60 characters, and user steps start with `[Manual]`.
  - The body has the six sections of `task.md` (Summary, Why, Tasks, Done when, Blocked by, Notes), with "None" for empty sections. The draft's per-type templates were dropped.
  - Labels come from `templates/common/labels.json` with the std-backlog priority criteria, `needs-user`, and the `origin/added` promotion rule. The draft's `type: bug`, `status: needs-triage`, and `priority: high` labels were dropped.
  - "TBD instead of guessing" and secret redaction were kept.
  - The output ends with a `ghp issue create --body-file` command, and the doc shows the sub-issue link command.
- There is no bug label, so user-visible bug fixes use `type/feature`, matching how app repos label them (for example workout-memo #263 and #268).
- Location: `docs/issue-prompt.md` in this repo only, not synced through `templates/common/`. The user runs it outside any repo, the labels are the same in every repo, and the prompt takes the repo name as a placeholder. Agents in app repos do not need it.
- No separate create-issue skill: inside Claude Code, std-backlog and std-git-writing already cover issue writing.
- The prompt's rules are copies. The doc names their sources and says to update it in the same PR when they change.

## Verification

- Checked by hand: the six section names match `templates/common/.github/ISSUE_TEMPLATE/task.md`, and every label name in the prompt exists in `templates/common/labels.json`.
- `npm run check`: passed.
