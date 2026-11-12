# #241 Compare the backend API shape of the 8 apps

The survey results and candidates for sharing are in [docs/research/api-survey.md](../research/api-survey.md). No code was changed.

## How it was checked

- Ran `git fetch` on the 8 app repos, then read `backend/src/**/*.ts` on `origin/main` with `git show`.
- For the response shape, delete status code, and ID handling, counted the patterns (`status(204)`, `rowCount ? 200 : 404`, `id::text`, `z.coerce.number()`) across whole files and read the matching places directly to confirm.
- The baseline is [directory-rules.md "API (Express)"](../directory-rules.md#api-express) and the scaffold `scaffold/app/backend`.
