# #1065 Keep every work issue under an epic and close finished epics automatically

- Issue: [#1065](https://github.com/sirloinbh/project-standards/issues/1065)
- Branch: `feat/1065-epic-structure-check`
- Parent: #1053 Agent work environment and backlog automation

## Changes — 2026-11-23

- `scripts/lib/epics.mjs` (Node built-ins, GitHub REST): lists open issues per repo, reports open work issues without a parent (`parent_issue_url`), and finds epics whose `sub_issues_summary` shows every sub-issue closed. Pull requests and bot-created issues are ignored. An epic whose body says "keep open" or "do not close" is skipped. Before closing, it lists the sub-issues again and skips the epic if any is open or none is found.
- `scripts/compliance.mjs`: `remoteStatuses` collects the structure for every target (a failure only blanks that repo's column, like repo settings). A new step `closeFinished` runs before the report is rendered in `--apply`, and closes finished epics with a comment naming the closed sub-issues.
- `docs/compliance.md` gets a "Work issues without epic" column and an "Epic structure" section (parentless issues, epics closed in this run).
- The orca-lanes skill (source `templates/common/skills/orca-lanes/`) assigns lanes by epic and says to take the next sub-issue in the same worktree and close the epic after the last. The std-backlog skill describes the automatic check and close.
- `docs/repo-settings.md` lists the App permissions the run needs (Issues read and write, already granted for the label sync).

## Verification

- `node --test scripts/test/epics.test.mjs scripts/test/compliance.test.mjs`: 17 passed, including: a finished epic is closed and a parentless issue is reported; a reopened sub-issue stops the close; an unreadable repo shows `unknown`.
