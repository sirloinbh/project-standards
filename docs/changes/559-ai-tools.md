# 559. AI tools in the apps (pilot: workout-memo)

## Change

- `templates/app/backend/src/standard/tools.ts` (new managed file): `defineTool` and `registerToolRoutes` serve `GET /internal/tools` and `POST /internal/tools/<name>` when `AI_TOOLS_PUBLIC_KEY` is set. Each call needs a short-lived EdDSA JWT from `shared-ai` (checked with Node `crypto`), the `<app>:read` or `<app>:write` scope, and writes one `audit_log` row; a write tool runs in a transaction with its row. Input is any Standard Schema with JSON Schema (Zod 4), so the file imports no validation library. The tool list is built at start.
- `scripts/standards-check.mjs`: routes under `/internal` are allowed besides `/api` (ADR-0017).
- `docs/ai-tools.md`, `docs/directory-rules.md`: how to define and serve tools, the token claims, the audit rows.

## Reason

- ADR-0017 keeps tools in the apps, behind one wrapper that checks the scope and writes the audit row, so `shared-ai` cannot skip either.
- Ed25519 keeps the check to Node built-ins (no JWT package); the app holds only `shared-ai`'s public key.

## Verification

- `node --test scripts/test/backend-tools.test.mjs`: 9 pass (no routes without a key; list; 401 for missing, badly signed, `alg: none`, wrong audience or issuer, expired, too long-lived, empty subject; 403 with a `denied` row; read row; 404; write in one transaction; 400 and rollback with `error` rows; name rules).
- workout-memo pilot in a temporary worktree against Postgres 17 (all 17 migrations): `list_workouts` and `add_workout` over real HTTP with real keys; 391 backend tests pass; ESLint, Prettier and `tsc` pass.
- `npm run check`: see the PR.

## Follow-up

- workout-memo PR with `backend/src/ai-tools.ts` after the sync PR brings `tools.ts`.
- #611 `shared-ai`: signs the tokens, joins the apps' API containers to the `shared-ai` network, and sets `AI_TOOLS_PUBLIC_KEY` in each app (a server step).
