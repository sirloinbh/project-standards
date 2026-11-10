# Environment variable rules (.env.example)

The `.env.example` of each repo is the source of truth for environment variables. The central repo collects these files and builds `docs/env-matrix.md` (#82). The real `.env` that holds actual values is not committed.

## Structure

`.env.example` is a section-managed file. Above `# --- project ---` are the common keys managed by the central repo, and below it the project writes freely.

```dotenv
# @desc PostgreSQL DB name (registry db.name) @required @used=compose
POSTGRES_DB=study
# @desc PostgreSQL user name @required @used=compose
POSTGRES_USER=study
# @desc PostgreSQL password. Change it locally before use @required @secret @used=compose,backend
POSTGRES_PASSWORD=
# @desc DB address the API connects to. The port is the registry db port @required @secret @used=backend
DATABASE_URL=postgres://study:<password>@localhost:15402/study
# @desc API port (registry api port) @required @used=backend,compose
PORT=3102
# @desc GitHub Packages read token (read:packages). Needed only to install shared packages @secret @used=npm
NODE_AUTH_TOKEN=
# --- project ---
```

## Comment rules

Use the following tags on the single line right above a key.

| Tag | Meaning |
|---|---|
| `@desc <description>` | What the value is used for, in English. Required |
| `@required` | The app does not work without it |
| `@secret` | A secret value. Leave the example value empty or put only a placeholder such as `<password>` |
| `@used=<place>` | Where it is used: `backend`, `frontend`, `compose`, `npm`, `ci`, comma-separated |

## What to follow

- Do not write real values for `@secret` keys. Values do not appear in `docs/env-matrix.md` either.
- Ports and DB names must match the registry values. `standards-check` compares `PORT`, the port and DB name in `DATABASE_URL`, and `POSTGRES_DB`.
- Values that go into the frontend build (the `VITE_` prefix) must not be secret. They are exposed to the browser as is.
- When adding a new key, fix `.env.example`, the code that uses it, and the deploy runbook (the server `.env` key list) in the same PR.

## Committed secret check (#259)

CI runs `secret-scan` every time to check the files being committed for tokens and keys. All repos are public, so a value that was pushed once is treated as already exposed even if it is deleted.

- Run: in the central repo `npm run secrets:check` (included in `npm run check`), in sub-repos `node .standards/secret-scan.mjs`. In CI it runs before dependencies are installed.
- What it blocks: tokens and keys recognizable by their shape (GitHub, Anthropic, OpenAI, AWS, npm, Slack, Google, Stripe live keys), private key blocks, and committed `.env` files (`.env.example`, `.sample`, and `.template` are allowed).
- The output shows only the file, line number, and rule name, never the value.
- For a deliberately placed fake value (in tests), add a `secret-scan:allow` comment on that line. In tests it is better to split the value into string pieces and build it at run time (`scripts/test/secret-scan.test.mjs`).
- History check: `node .standards/secret-scan.mjs --history` checks the lines added by commits on all branches. It is not used in CI; run it when first introducing the check and when a leak is suspected.
- It is built with Node built-in modules, without external tools (gitleaks and so on). This avoids bringing in a new supply-chain risk, and it checks only shapes with few false positives so that a finding can fail the build right away. A wider list of providers is handled by GitHub secret scanning ([repo-settings.md](repo-settings.md)).
- If something is found: if it is a real value, first revoke and rotate that key, remove it from the commit, and tell the user. Removing it from history (force push) is the user's decision.

## Common keys: Claude API (#264)

Apps that use the Claude API use the names below. The source of truth for the key value is one place, AWS SSM Parameter Store `/sirloinbh/anthropic-api-key` ([ADR-0010](adr/0010-claude-api-key-ssm.md)).

| Key | Tags | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | `@secret @used=backend` | Claude API key. On the server, the deploy script reads it from SSM and passes it on, so it is not written in the server `.env`. Locally, a central command puts it in |
| `CLAUDE_MODEL` | `@used=backend` | Model name. Not hard-coded in code. The default is `claude-sonnet-5-5` |

- Do not pass the Claude API key to the frontend (the `VITE_` prefix). It would be exposed to the browser. Make calls only from the backend.
- CI holds no real key. Tests replace the API call with a fake.

## Per-app external service keys (#422, proposal)

The option of also keeping external service keys other than the Claude API key (the public data portal, Google OAuth, market price APIs, and so on) in SSM, and the issuing procedure, are in the [survey document](research/app-secrets-ssm.md). Until that is adopted and implemented, they are kept in each app's `.env`.
