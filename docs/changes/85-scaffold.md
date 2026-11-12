# #85 New project scaffold

## Change

| File | Content |
|---|---|
| `scaffold/app/` | Starter files that the project owns. A slimmed-down version of the workout-memo structure: root, `frontend`, and `backend` `package.json` (pinned versions), `compose.yaml` (with the build secret), `.env.example`, `playwright.config.ts`, `shared/contract.ts` and `scripts/contract.mjs`, an overview screen (React Router, TanStack Query, `cn()`), `/api/health` and the `routes/shared.ts` error format, a starter `db:migrate`, `database/`, e2e (axe accessibility, 360px horizontal overflow), `README.md`, and `AGENTS.project.md` |
| `scripts/scaffold.mjs` | Creates the first commit of a project registered in the registry and `sync.config.json`. It renders the files above, `docs/runbooks` (#35), the contract copy, and the centrally managed files and manifest that the first sync will write, all at once. It writes only into an empty folder |
| `scripts/test/scaffold.test.mjs` | Renders a virtual slot 99 project: passes the registry check, no leftover template variables, the standard tree, 0 standards-check problems or warnings in the output, dependencies are pinned versions and match the dependency policy table and our own package versions, all 8 registered apps render, and a non-empty folder is rejected |
| `README.md`, `docs/design.md` 6.6 | Added the scaffold command, install approval, and the `npm run format` step to the procedure for adding a new project |

## Decisions

- The scaffold also writes the centrally managed files. This way `.npmrc` (`ignore-scripts=true`) exists from the first commit, so install scripts are blocked even at the first install.
- Dependency versions are pinned to the [dependency policy](../dependency-policy.md) table and the versions installed in the workout-memo lockfile. Items not in the table (`@types/*`, `tsx`, Testing Library, `jsdom`, `@axe-core/playwright`) are also workout-memo installed versions. There are no new packages.
- `db:migrate` is a minimal starter implementation (file name order, `schema_migrations` checksum, a transaction per file, advisory lock). The common runner is decided in #27.
- Tables in documents filled by template variables align differently depending on value length, so they cannot be pre-aligned centrally. They are aligned with `npm run format` after install.
- The merge rule in `AGENTS.project.md` starts as "agent merges after required CI passes", which all 8 apps use.

## Checks

- `npm run check` passed.
- I ran the slot 99 output with workout-memo's installed `node_modules` and the central `packages/` linked in (nothing installed).
  - Passed: `tsc` (frontend, backend), `eslint .`, 2 backend tests, 1 screen test, `vite build`, the backend `tsc` build, `contract.mjs`, `claude-skills.mjs`, `.standards/check.mjs`.
  - `prettier --check`: only the table alignment of 5 documents filled by template variables remains (the `npm run format` step).
  - Not run: e2e (needs a test DB and the `@axe-core/playwright` install), and `db:migrate` against a real PostgreSQL.
