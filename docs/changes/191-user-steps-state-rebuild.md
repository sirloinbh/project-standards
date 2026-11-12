# #191 Update chapter 2 of the user steps doc with the state rebuild result

## Change

| File | Content |
|---|---|
| `docs/user-steps.md` chapter 2 | Removed the "copy state from another PC" procedure and replaced it with the #92 result (rebuilt by import, provider v6.68.0, plan "No changes") and guidance for working on the infrastructure from another PC. The detailed procedure links to a chapter of `docs/operations.md` in shared-aws-infrastructure |
| `docs/user-steps.md` chapter 2 | Added PowerShell 5.1 cautions: line breaks, dropped empty-string arguments, no `<` redirection, UTF-8 without BOM, the `.ssh` folder, and the AWS CLI's agent integration question |
| `docs/user-steps.md` table | Marked row 2 as done and updated the recommended order and "What the agent does next" |
| `docs/user-steps.md` 3-2 | Replaced the `<` redirection command, which does not work in PowerShell, with guidance for registering in the web UI |
| `docs/user-steps.md` 4-1, 8 | Replaced a specific user's path with `<project-standards folder>`. The tag is placed on `origin/main` without changing local main (the #192 Fork app rule) |

## Decisions

- The source of the infrastructure procedure is only `docs/operations.md` in shared-aws-infrastructure. This document keeps only the order and the criteria for judgment, so the two places do not diverge.
- We did not include account IDs, IPs, emails, or state values.

## Verification

- Confirmed with `grep` that user paths, account IDs, IPs, and emails are not in the doc
- `npm run check` passed (391 of 392 tests passed, 1 skipped; registry-check, docs check, tokens check, package-guard, check-workflows)
