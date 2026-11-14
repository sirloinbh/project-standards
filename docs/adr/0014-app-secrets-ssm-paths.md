# 0014. Keep every app's external service keys in AWS SSM, named by path and tagged in .env.example

- Status: Accepted (issue #424)
- Date: 2026-11-14
- Amends: [ADR-0010](0010-claude-api-key-ssm.md)

## Context

- ADR-0010 put one value, the Claude API key, in SSM Parameter Store. The server could read only that parameter, and the deploy script named it directly.
- The user decided on 2026-11-08 to manage all environment variables and API keys in SSM. Five apps are waiting for about 10 external service keys (public data portal, Google OAuth, market price APIs, Garmin, and so on). The survey and proposal are in [research/app-secrets-ssm.md](../research/app-secrets-ssm.md) (#422).
- One public data portal key serves several apps under different environment variable names, so the SSM name and the variable name must be separate.

## Decision

| Item | Decision |
|---|---|
| Names | A key several apps share: `/sirloinbh/shared/<name>`. A key only one app uses: `/sirloinbh/<app>/<name>` (`<app>` is the registry name). `<name>` is lowercase letters, digits, and hyphens |
| Claude key | Moves from `/sirloinbh/anthropic-api-key` to `/sirloinbh/shared/anthropic-api-key`. The old parameter never held a value (#266 was not done), so nothing moves |
| Parameter type | SecureString, AWS managed KMS key (`alias/aws/ssm`), standard tier (free), `ap-northeast-2` |
| Which variable gets which parameter | The app's `.env.example` (the source of its variables) tags the key: `@ssm=<parameter>` on the comment line above it. The key must also be `@secret`, have an empty example value, and not start with `VITE_` |
| Server | `deploy/remote-deploy.sh` reads every tagged key with `deploy/ssm-get.sh` after checking out the commit it starts, and exports it, so compose passes it to the containers. Nothing is written to the server `.env`. Apps with `features.claude` also get `ANTHROPIC_API_KEY` from the shared path when `.env.example` does not tag it. A failed read warns and keeps any `.env` value, as before |
| Local development | `node tools/app-secrets.mjs pull <app>` writes the app's tagged keys into that app's `.env`. `check <app>` reports presence only. `set <parameter>` stores any allowed name from standard input. Without an app, the commands keep handling the Claude key in `project-standards/.env` (ADR-0010) |
| Checks | `standards-check` (in each app) and the compliance report fail on a tag that breaks the rules above, including a parameter of another app. `docs/env-matrix.md` shows the parameter name, never the value |
| Server permission | `sirloinbh-apps-secrets-reader` may `ssm:GetParameter` on `parameter/sirloinbh/shared/*` and `parameter/sirloinbh/<app>/*` for the apps on the server (shared-aws-infrastructure) |
| User permission | The user's personal AWS identity gets `ssm:PutParameter`, `GetParameter`, and `DeleteParameter` on `parameter/sirloinbh/*` (a user step in the AWS console; this identity is not managed by Terraform) |
| Agents and CI | No access. Tests use a fake AWS CLI and a fake `ssm-get.sh` |

## Not in SSM

- Values an app receives while running, such as an OAuth refresh token: the app stores them in its DB.
- Values decided on the server, such as the DB password: they stay in the server `.env`.
- The SSM read key pair itself: it stays in the shared server file `/opt/project-standards/.env` (ADR-0010).

## Consequences

- Adding a key to an app is: put the value in SSM (`set`), tag it in `.env.example`, read it in the backend. No deploy script change.
- All apps run on one server with one reader identity, so a leaked server key exposes every app key. Rotate them all together (the same judgment as ADR-0010).
- Each deploy makes one SSM call per tagged key. Standard parameters allow 40 reads per second, far above this use.
- Rotation stays the same: change only the SSM value. The server uses it from the next deploy; a PC after `pull` again.
