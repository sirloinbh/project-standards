# Code conventions (names, exports, types, test locations)

This is the code shape all 8 apps follow. Most of it records what all 8 apps were already doing the same way (compared 2026-10-28: [research/convention-survey.md](../research/convention-survey.md), #243). If you need to do something differently from this document, do not change it in the app; open an issue in the central repo.

| Convention | Rule | Check |
|---|---|---|
| Import paths | Use relative paths only (`./`, `../`). Do not use path aliases (`@/`) | — |
| Exports | Use only named exports. Use `export default` only in tool config files (`*.config.*`) | ESLint `no-restricted-syntax` (`@sirloinbh/eslint-config` 1.1.0) |
| Components | Write them as `export function Name()` function declarations. Do not use arrow function components | — |
| Types | Use only `type`. Do not use `interface` | ESLint `@typescript-eslint/consistent-type-definitions: type` (1.1.0) |
| Import order | `simple-import-sort` order. `eslint --fix` sorts them | ESLint (after install approval #245, #246) |
| Frontend file names | Lowercase and hyphens: `study-logs.tsx`, `month-calendar.ts`. Screen files too (`study-logs.tsx`, not `StudyLogs.tsx`) | `standards-check` warning |
| Backend test location | `backend/test/*.test.ts` (`node:test`, `tsx --test`) | — |
| Frontend test location | `*.test.ts(x)` next to the target file (Vitest) | — |
| Browser tests | `e2e/*.spec.ts` (Playwright) | — |
| Branch, commit, PR | `<type>/<issue-number>-<english-summary>`, `<type>: <what was done> (#number)` | [std-git-writing](../../templates/common/skills/std-git-writing/SKILL.md) |

## Frontend file names

- File names use only lowercase English, digits, and hyphens. A dot is used only to separate kinds: `app.test.tsx`, `vite-env.d.ts`.
- Do not keep a screen file and that screen's logic file with the same name and different extensions. In study-log, `StudyLogs.tsx` (screen) and `study-logs.ts` (logic) differ only in case, which is confusing on Windows and macOS. Split the names, for example the screen as `study-logs.tsx` and the logic as `study-logs-data.ts`.
- `standards-check` looks at the `.ts` and `.tsx` file names under `frontend/src` and warns (it is not a failure). Renaming in study-log is done as a study-log repo issue.

## What was not changed

- The backend folder structure (`routes/<feature>.ts` versus `src/<feature>.ts`) is left different per app. The rules are in [directory-rules.md](../directory-rules.md), and only new apps follow them (#243 candidate F).
