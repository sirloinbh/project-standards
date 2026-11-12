# #326 Response to the zod security advisory: block unbounded arrays and add a check

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/http.ts` | Responds with only the first 10 zod issue messages (`MAX_ISSUES`) and "외 N개" (and N more) |
| `scripts/standards-check.mjs` | `checkZodArrays`: warns about `z.array` and `.array()` without a length limit |
| `scripts/test/backend-http.test.mjs`, `scripts/test/standards-check.test.mjs` | Tests |
| `docs/research/zod4.md` | Decision |
| `docs/directory-rules.md` | List of check warnings, description of the 400 response |

## Decisions

- The user chose option A in #307. zod stays at 3.25.76, and the attack path (an array without a length limit) is blocked.
- Shortening the response message does not remove the memory problem, because the issues have already piled up inside zod. The real fix is adding `.max()` to arrays, and the message limit is a supporting measure that prevents responses of several MB.
- The check only warns (same as the API rule warnings). It follows parentheses through chains that span several lines to find `.max()` and `.length()`. Files that do not import zod are not read.
- `ids` in study-log `backend/src/textbook-contents.ts` is fixed in a study-log PR.

## Checks

- `node --test scripts/test/backend-http.test.mjs`: 8 passed (50,000 issues give 10 messages plus "외 49990개", meaning "and 49,990 more")
- `node --test scripts/test/standards-check.test.mjs scripts/test/scaffold.test.mjs`: 30 passed
- `checkZodArrays` on `backend/src` of the 8 apps' `origin/main`: only 1 warning, study-log `textbook-contents.ts:54`
- Type-checked the managed file with workout-memo's TypeScript and checked it with the same app's ESLint and Prettier: no problems
