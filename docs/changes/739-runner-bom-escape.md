# #739 Write the BOM in the migration runner as an escape

## Change

- `templates/app/backend/src/standard/migrations.ts`: `stripBom` used a literal U+FEFF character inside its regex. It is now the escape `\uFEFF`. The literal character failed the apps' ESLint rule `no-irregular-whitespace`, so `verify` failed in every app that received the file.
- `scripts/test/backend-migrations.test.mjs`: the managed runner files must contain no irregular whitespace characters.

## Reason

Found in dev-career-portfolio's sync PR while adopting the runner (#698).

## Verification

- `node --test scripts/test/backend-migrations.test.mjs`: 11 pass.
- `npm run check`: see the PR.
