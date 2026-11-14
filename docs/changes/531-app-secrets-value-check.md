# #531 app-secrets set accepts text that is not a key

## Background

On 2026-11-14, during #266 step 4, the clipboard held copied terminal text instead of the Claude key, because the command line had been copied to avoid typos. `node tools/app-secrets.mjs set` stored 519 characters of that text at `/sirloinbh/shared/anthropic-api-key`, and `pull` wrote it into `project-standards/.env` as several lines. Nothing failed: the server's SSM read worked, and only a manual length check (`ssm-get.sh ... | wc -c`) showed the problem.

## Change

- `tools/app-secrets.mjs`: new `valueProblem(parameter, value)`. `set` refuses a value with line breaks or spaces, and for the shared Claude key anything not in the `sk-ant-...` form. It fails before any AWS call, and the message never repeats the value.
- `pull` refuses a stored value with line breaks, so a bad value never reaches a `.env` as several lines.
- `docs/user-steps.md` section 10 step 4: type the `Get-Clipboard` line instead of pasting it.

## Verification

- `node --test scripts/test/app-secrets.test.mjs`: 14 passed (2 new: refused inputs, and pull refusing a multi-line stored value).
- `npm run check` (Git Bash): see the PR.
