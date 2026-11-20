# #829 Let OpenAPI operations describe path parameters with Zod schemas

## Change

- `templates/app/backend/src/standard/openapi.ts`: `Operation.params?: Record<string, ZodType>`. A path parameter listed there uses its schema (through `schemaOf`). One that is not listed is an integer id (`{ type: 'integer', minimum: 1 }`) when its name is `id` or ends in `Id` (for example `workoutId`), and a string otherwise. Before, only the exact name `id` was an integer.
- `scripts/test/backend-openapi.test.mjs`: tests for the default, the `Id` suffix (and that `grid` or `ID` are not ids) and a `params` schema winning over the default.

## Why

study-log (`:kind` enum, `:start` date), cert-manager and money-ledger need exact path parameter schemas for the #709 adoption of the shared modules.

## Checks

- `node --test scripts/test/backend-openapi.test.mjs`: 6 pass. The rendered file was copied into money-ledger: `npm run lint` and the backend typecheck pass; restored afterwards. `npm run check`: see the PR.
- An app whose operations already use a `:somethingId` path parameter now documents it as an integer; check `npm run openapi` output in the app after the sync.
