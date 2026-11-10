# Comparing the code conventions of the 8 apps (#243)

Surveyed on 2026-10-28. I read the file lists, `frontend/src` and `backend/src` code, and app-specific skills (`skills/<app>-*`) on `origin/main` of the 8 app repos with `git show`. No code was changed. Adopted items are listed under "Decisions" at the bottom and will be registered as follow-up issues.

The 5 skeleton-only apps (health-log, life-journal, money-ledger, english-study, dev-career-portfolio) are still the plain scaffold, so they are identical to each other. "5 skeletons" in the tables below are values checked on health-log.

## 1. Already the same (only need to be written as rules)

| Item | Common to all 8 apps |
|---|---|
| Import paths | Relative paths only (`./`, `../`). 0 uses of the alias (`@/`) |
| Exports | Named exports only. 0 `export default` |
| Components | `export function Name()` function declarations. 0 arrow-function components |
| Types | `type` only. 0 `interface` |
| Backend test location | `backend/test/*.test.ts` (node:test) |
| Frontend test location | `*.test.tsx` next to the target (Vitest) |
| Browser tests | `e2e/*.spec.ts` (only in workout-memo) |
| Branch and commit | `<type>/<number>-<summary>`, `<type>: … (#number)` (`std-git-writing`) |

## 2. Different

| Item | workout-memo | study-log | plan-routine | 5 skeletons |
|---|---|---|---|---|
| Frontend file names | All lowercase-hyphen (`body.tsx`, `date-range.ts`) | **Mixed**: 15 screens in PascalCase (`StudyLogs.tsx`), 17 other modules in lowercase-hyphen (`study-logs.ts`) | Lowercase-hyphen | Lowercase-hyphen |
| Splitting screen and logic | Screen file + logic file (`progress.tsx`/`progression.ts`) | Screen (`StudyLogs.tsx`) + logic with the same name (`study-logs.ts`) | One file | — |
| Backend folders | `routes/<feature>.ts` + `domain.ts` | `src/<feature>.ts` (flat) | `src/<feature>.ts` + `<feature>-routes.ts` | `app.ts` only |
| Type and schema location | `shared/contract.ts` (shared by screen and server) + `domain.ts` | Inside the feature file | Inside the feature file | — |
| Number of frontend tests (excluding common components) | 19 | 1 (`app.test.tsx`, 16 screens) | 2 | 1 |

## 3. App-specific skills

Each app has `<app>-foundation`, `<app>-implementation`, and `<app>-testing` skills (workout-memo has one more, `workout-communication`).

- **They overlap with the central skills.** The account check, issue registration, and branch rules in `<app>-implementation` have the same content as the central `std-implementation` and `std-git-writing`. The sentences in three apps differ only by the app name.
- **Some lines are no longer true.**
  - study-log and plan-routine `*-testing`: "Vitest and Playwright, not yet introduced". All 8 apps now have Vitest and Testing Library installed (#240).
  - study-log and plan-routine `*-foundation`: "design tokens (CSS variables in `frontend/src/style.css`)". The source is now the `@sirloinbh/design-tokens` package (#126).
- **Rules that fit the other apps too:**
  - The common screen checks in workout-memo `workout-testing` (4 responsive widths, axe WCAG 2.1 AA, visual regression)
  - The rule in workout-memo `workout-communication`: "Korean for the user, original text for identifiers and logs"

## 4. Adoption candidates

| # | Candidate | Approach | Verdict |
|---|---|---|---|
| A | Write the common conventions from section 1 as a rules document (`docs/conventions/code.md`) | Rules document. Most can be checked with ESLint without new packages: `no-restricted-syntax` (ban `ExportDefaultDeclaration`, excluding config files), `@typescript-eslint/consistent-type-definitions: type`. Import order uses #244 `simple-import-sort` | **Recommended** |
| B | Frontend file names in lowercase-hyphen | Rules document + a check (`standards-check` warning). Renaming the 15 study-log files is a study-log issue | **Recommended** |
| C | Remove lines in app skills that overlap with central skills, and fix lines that are no longer true | 3 app repo issues (or a sync PR). App skills keep only app-specific facts (domain, units, screen check targets) | **Recommended** |
| D | Make the communication rule (`workout-communication`) a central skill | Add `std-communication` to `templates/common/skills/` | **Recommended** |
| E | Spread the common screen checks (responsive, axe, visual regression) to other apps | Needs Playwright installed, so after #245. Start with study-log and plan-routine, which have screens | On hold |
| F | Align the backend folder structure to `routes/<feature>.ts` | — | Not doing. The rule (`directory-rules.md`) already exists, and moving costs more than it gains. Only new apps follow it |
| G | Add frontend tests to study-log | study-log issue | Recommended but outside the scope of this survey. Register it together at decision time |

## Decisions

- On 2026-10-28 the user adopted the recommendations in section 4.
- A: docs in #312, ESLint check in #308
- B: #312
- C, D: #313
- E: on hold (after #245)
- F: not doing
- G: #314
