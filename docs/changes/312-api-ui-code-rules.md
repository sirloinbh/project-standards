# #312 Rules for API, loading screens, and code conventions, and a file name check

## Change

| File | Content |
|---|---|
| `docs/directory-rules.md` | `PATCH`, action path `POST /:id/<action>`, delete `200` and `204`, "success response shape" (new code uses `{ items }` and `{ item }`), IDs in JSON are numbers, list of check warnings |
| `docs/ui-components.md` | "Loading screens": lists use `SkeletonList` and `SkeletonCard`, buttons use `Spinner`, failures use `Notice` |
| `docs/conventions/code.md` | New document: 8 conventions the 8 apps already followed in common, plus lowercase-hyphen frontend file names |
| `scripts/standards-check.mjs` | `checkFileNames`: warns about `.ts` and `.tsx` names in `frontend/src` |
| `scripts/test/standards-check.test.mjs` | File name check test |

## Decisions

- The document rules do not change current code. workout-memo's "respond with the row as is" and plan-routine's string IDs need screen changes together, so they are recorded as exceptions for existing apps. New code and new apps follow the rules.
- The file name check only warns (same as the API rule warnings). Based on the 8 apps' `origin/main`, only study-log has hits (15), and the other 7 have 0.
- When a screen file and a logic file differ only in case (study-log `StudyLogs.tsx` and `study-logs.ts`), lowercasing would make the imports collide. So the document says to rename the logic file.

## App issues

| App | Issue |
|---|---|
| study-log | sirloinbh/study-log#117 15 file names, sirloinbh/study-log#118 loading indicators |
| workout-memo | sirloinbh/workout-memo#173 loading indicators |
| plan-routine | sirloinbh/plan-routine#34 loading indicators |

The 5 skeleton apps have no feature screens, so no issues were created.

## Checks

- `node --test scripts/test/standards-check.test.mjs scripts/test/scaffold.test.mjs`: 29 passed. All scaffold and shared UI file names follow the rule
- Ran `checkFileNames` on the 8 apps' `origin/main` file lists: study-log 15, the others 0
- The result of `npm run check` is written in the PR
