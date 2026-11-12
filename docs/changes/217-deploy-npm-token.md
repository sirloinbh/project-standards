# Pass the package token from .env to the build in server deploys (#217)

## Change

| File | Content |
|---|---|
| `templates/app/deploy/remote-deploy.sh.tmpl` | If the environment variable `NODE_AUTH_TOKEN` is not set, reads it from the server `.env` and exports it. Quotes and CR are removed. The value is not printed |
| `scripts/test/deploy-templates.test.mjs` | Checks the value a child process receives for 4 `.env` formats (plain, quoted and CRLF, no token, environment variable first) |

## Why

- After workout-memo#143 was merged, the automatic server deploy failed at `npm ci` with `401 Unauthorized ... authentication token not provided`. It stopped at the image build step, so production kept running the previous version (`c4f9897421cf`).
- The compose build secret (`secrets.npm_token.environment: NODE_AUTH_TOKEN`) reads its value only from the shell environment. Values in the server `.env` are used only for variable substitution in the compose file and do not reach the secret.
- `WEB_PORT` is already read from `.env` the same way (`sed`), so this follows the same approach.

## Checks

- `npm run check`: passed (408 of 412 tests passed, 4 skipped, 0 failed). The new test was skipped because node on Windows cannot find bash; it runs in CI (ubuntu).
- Ran the same block directly in Git Bash with the 4 `.env` formats and confirmed the expected values.
- The real server deploy will be checked by merging the workout-memo sync PR after this merge.
