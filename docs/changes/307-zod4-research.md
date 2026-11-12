# #307 Research on moving to zod 4

## Change

| File | Content |
|---|---|
| `docs/research/zod4.md` | Security advisory, the apps' actual exposure, the number of APIs that change in zod 4, options A to D |

## Decisions

- This was research only. No code was changed.
- The "stay on zod 3" recommendation in #240 missed that the zod 4 PR is a security update. This document makes that judgment again (#306 is on hold).

## Checks

- Read the 8 apps' `origin/main` with `git show` and counted. Array schemas were checked by following parentheses, including chains that span several lines.
- Package information was checked with `npm view zod@<version> exports` and `npm view zod time` (read-only).
- The Dependabot alert content was read through the GitHub API (`dependabot/alerts`).
- The cause of the CI failure of the zod bundle PR was confirmed in the health-log work log.
