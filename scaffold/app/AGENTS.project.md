# {{project.title}} project-specific instructions

This file holds rules that apply only to {{project.name}}. The common instructions are in [AGENTS.md](AGENTS.md) (centrally managed). If the two files differ, this file wins.

## Service rules

- Service name: {{project.displayName}}.
- Dates are `YYYY-MM-DD`, and the service time zone is `Asia/Seoul`.
- Validate input on the server too. The source of the input schemas is `shared/contract.ts`.

## Work procedure (in addition to the common procedure)

- After opening a PR, go through automated code review up to 2 times. Apply the improvements as additional commits, and split fixes that are too big for this PR into new issues.
- **When all required CI checks on the final head pass, the agent merges the PR** (`--merge --match-head-commit <the verified SHA>`). Do not merge while a check is failing or in progress, do not bypass protection rules (for example `--admin`), do not approve your own PR, do not push directly to main, and do not force push.
- Once production deploy is connected, merging to main is the deploy. At that point, add the deploy check procedure to this section ([Deployment and operations](docs/deployment.md)).

## Project-specific skills and docs

- Use the common skills (`std-*`). If a procedure needed only by this project appears, create it as `skills/{{project.db.name}}-*` and list it here.

## Project-specific verification commands

- Unit tests: `npm test`. The backend uses node:test (`backend/test`), and the UI uses Vitest and Testing Library (`frontend/src/*.test.tsx`).
- Browser checks: `npm run test:e2e`. Point `E2E_DATABASE_URL` (or `TEST_DATABASE_URL` if it is not set) at a test DB prepared with `db:migrate`. It uses API port {{project.ports.e2eApi}} and web port {{project.ports.e2eWeb}}, and never points at a personal DB.
- Changing input schemas: edit `shared/contract.ts`, then run `npm run contract:sync`. Do not edit the copies directly.
