# Fix managed frontend files that declare interface

The apps' ESLint config bans `interface` (`@typescript-eslint/consistent-type-definitions: 'type'`, #243). Two managed files declared one, so lint failed in every app sync PR.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/lib/api.ts` | `RequestOptions` and `JsonRequestOptions` are `type` (from #682) |
| `templates/ui/frontend/src/session-watch.ts` | `MarkStorage` is `type` (from #669) |
| `scripts/test/type-not-interface.test.mjs` | New test: no TypeScript under `templates/` or `scaffold/` declares an `interface`. It reads the sources, because this repo does not install ESLint. Checked once by putting an `interface` back: the test failed and named the file and line |

## Notes

- `session-watch.ts` is in the sign-in area (lane-1); it is the same one-word fix and was failing the same lint.
