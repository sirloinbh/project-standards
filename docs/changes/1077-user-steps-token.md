# #1077 User steps: drop the `public` check, add the operations token

- Issue: [#1077](https://github.com/sirloinbh/project-standards/issues/1077) (Refs; stays open until the token is stored and one real open/close is seen). Also relates to #1087.
- Branch: `docs/1077-user-steps-token`

## Changes — 2026-11-26

- `docs/user-steps.md`: section 11 step 6 now says the healthchecks.io `public` check is dropped (user decision on #1077, 2026-11-26). New section 18 and summary row 18: create the fine-grained token (Issues and Deployments write, only the project-standards and app repos), store it at `/sirloinbh/shared/github-ops-token`, verify it without printing it (`ssm-get.sh ... | wc -c`), see both features work, rotate.
- Requested by the coordinator (lane brief 2026-11-26); docs only.

## Verification

- `npm run check`: see the PR.
