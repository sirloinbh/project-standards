# 492: Translate Korean code comments to English

## Problem

Some code comments in `scripts/`, `tools/`, `templates/`, `scaffold/`, and `packages/` were still in Korean (#492).

## Change

- Translated the Korean comments in `scripts/test/dark-only.test.mjs`, `scaffold/app/database/migrations/001_init.sql`, and the `@desc` annotations in `scaffold/app/.env.example`.
- The copies under `.claude/`, `.codex/`, and `.github/` had no Korean in code files, so nothing changed there.
- Kept on purpose (code or tests match on them, or they are product text for a Korean-language app):
  - Legacy header and sync commit prefix in `scripts/lib/render.mjs` and `scripts/lib/sync-pr.mjs`, plus the tests that use them.
  - Korean test fixtures and Korean regex alternatives in `scripts/test/` (Korean handling checks), and the Korean label names in `scripts/test/labels.test.mjs` and `tools/labels.mjs`.
  - Korean answer words `예|네` in `tools/dependency-prs.mjs` and `tools/labels.mjs`, and `완료 기준` in `tools/agents/workflow.mjs`.
  - Scaffold app UI texts, error messages, OpenAPI descriptions, and their tests (`scaffold/app/backend`, `frontend`, `e2e`, `docs/openapi.json.tmpl`, `shared/contract.ts`), because the generated apps are Korean-language.
- Not changed, needs a package release: the Korean `description` fields in `packages/*/package.json` and the Korean lint message in `packages/eslint-config/index.mjs`.

## Checks

- `UPDATE_SNAPSHOT=1 npm test` and `npm run check` (results in the PR).
