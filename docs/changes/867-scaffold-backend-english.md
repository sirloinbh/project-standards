# #867 Translate the Korean texts in the scaffold backend to English

## Change

- `scaffold/app/backend/src/openapi.ts` and `scaffold/app/docs/openapi.json.tmpl`: summaries, description, `errorDescription` and `statusText` are English; the generated JSON equals what `buildOpenApi` returns for the table.
- `scaffold/app/backend/src/routes/shared.ts`: the comment says errors carry an English message.
- `docs/directory-rules.md`: the `parseId` 400 message is quoted as `Invalid <what> ID`, as `http.ts` sends it.
- Left as is: the Korean sample project in `scripts/test/scaffold.test.mjs` (test data) and the "before" columns of the comparison table in `directory-rules.md`.

## Reason

Apps answer in English, but a new app got Korean OpenAPI text and a comment that told its author to write Korean messages. #488 missed these files.
