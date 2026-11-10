# Next steps

Last updated: **YYYY-MM-DD (Asia/Seoul)**. This file is used as `docs/next-steps/README.md`. Do not create a new one per date; update the same file. Before acting, check the actual state on GitHub again.

## Update rules

- When writing the daily log, also update the priorities, prerequisites, blockers, and next actions. Update them on the same day too if the situation changes.
- Priorities follow the issue labels (`priority/*`) and the order of the std-backlog skill. This document only summarizes that result in a form that is easy to read.
- Remove finished items from here, and leave the result, PRs, and verification in that day's [daily log](../daily/README.md).
- Editing this document does not file an issue or run any work.

## Top priority

| Order | Item | Current state | Next action and prerequisites |
|---|---|---|---|
| 1 | [#number Title](https://github.com/sirloinbh/{{project.repos.umbrella}}/issues/number) | Facts confirmed | What to do and what is being waited on |

## What the user needs to do

- [ ] Work that needs a user decision, approval, or direct action. Related issue number and link to the guide document

## Follow-up work

- Work not started now but not to be forgotten. If there is no issue, file one and write its number.

## Operating state

| Item | Value checked | Date checked |
|---|---|---|
| Deployed commit | `/opt/{{project.name}}/.deployed` | YYYY-MM-DD |
| Last DB dump | `/var/backups/{{project.db.name}}/` | YYYY-MM-DD |
