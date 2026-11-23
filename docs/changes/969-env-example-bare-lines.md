# #969 standards-check rejects bare .env.example lines

- Issue: [#969](https://github.com/sirloinbh/project-standards/issues/969)
- Branch: `fix/969-env-example-bare-lines`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

The `AI_TOOLS_PUBLIC_KEY` comment in two apps' `.env.example` was split by a real line break where the text means the two characters `\n`. The second half became a bare line, and `docker compose` refuses a `.env` copied from it (`unexpected character ")" in variable name`). Nothing in standards-check caught it.

## Change

- `scripts/lib/env-tags.mjs`: new `bareEnvLines(text)` returns the lines that are not blank, not a `#` comment, and not `KEY=value`.
- `scripts/standards-check.mjs`: each such line is a problem in the group `env example` (line number plus the text).
- `scripts/test/standards-check.test.mjs`: a bare line fails the check; the clean fixture still passes.
- dev-career-portfolio `.env.example`: lines 6–7 joined back into one comment (separate PR in that repo).

## Left out

- study-log `.env.example` line 33 has the same split. study-log is out of scope for the lanes on 2026-11-23, so it stays for the handoff; study-log's standards-check fails on it after the next sync until it is fixed.

## Checks

- `node --test scripts/test/standards-check.test.mjs`: pass.
- dev-career-portfolio: `cp .env.example .env && docker compose config --services` lists db, api, web.
- `npm run check` (Git Bash, Windows): pass.
