# #608 Scaffold health tests use the English error texts

## Change

| File | Content |
|---|---|
| `scaffold/app/backend/test/health.test.ts` | Expects `Server error`, `API not found` and `Request body is not valid JSON`, the texts the managed `standard/http.ts` sends |
| `scripts/test/scaffold.test.mjs` | Every `error: '...'` text in the scaffold health test must appear in `standard/http.ts`, so the two cannot drift again |

## Notes

- The other scaffold tests were checked against the rendered scaffold: `migrations.test.ts` still matches the Korean messages of `src/migrations.ts` (a project-owned file), and `sign-in.test.ts` uses the shared auth client's `unauthorized`.
- I could not run the rendered backend tests here: the scaffold has no installed dependencies and package installs need the user's approval. Running them in CI is split into a new issue (see the PR).

## Verification

- `npm run check`: recorded in the PR body
