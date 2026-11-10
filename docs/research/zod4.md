# Whether and in what order to move to zod 4 (#307)

Surveyed on 2026-10-28. I read `origin/main` of the 8 app repos with `git show` and gathered package information with read-only `npm view`. Nothing was installed. The adopted candidate is listed under "Decisions" at the bottom.

## 1. Why look now: the zod 4 PRs are security updates

The #240 survey treated the zod 4 PRs as version-bump PRs and recommended "stay on zod 3". But these PRs were security updates (#306 on hold).

| Item | Content |
|---|---|
| Advisory | GHSA-mrhx-c7xc-m3w5 (CVE-2023-54404), high, published 2026-10-01 |
| Description | If a large array is sent to an array schema with no length limit, validation issues pile up endlessly for each failing element and memory runs out (`$ZodArray`) |
| Affected versions | `< 4.6.6`. There is no fixed version for zod 3 |
| Apps | All 8 on zod 3.25.76 (`backend/`, and also `frontend/` in workout-memo) |
| Open PRs | One Dependabot `security-major` grouped PR per app (3.25.76 → 4.6.7) |

## 2. Where the apps are actually exposed

To attack, a `z.array(...)` with no length limit has to validate a request body. I found every array schema in `backend/src`, `shared`, and `frontend/src` (excluding tests) of the 8 apps and checked whether `.max()` or `.length()` follows. Schemas spanning several lines were counted by following the parentheses.

| App | Array schemas | No length limit |
|---|---:|---|
| workout-memo | 15 | 0 |
| study-log | 2 | **1**: `ids` of the table-of-contents reorder (`PUT …/contents/order`) at `backend/src/textbook-contents.ts:54` |
| plan-routine, 5 skeletons | 0 | 0 |

- The exposed place is one spot in study-log. The request body limit (`express.json({ limit: '256kb' })`) caps the elements at tens of thousands at most. Even so, an issue is created for each element, and the error handler joins all those messages into the response (several MB).
- The central error handler (`backend/src/standard/http.ts`, #309) also joins issue messages with no count limit.

## 3. What changes when moving to zod 4

I counted the APIs in app code that are removed or changed in zod 4 (excluding tests).

| API | workout-memo | study-log | plan-routine | 5 skeletons | zod 4 |
|---|---:|---:|---:|---:|---|
| `required_error`, `invalid_type_error` | 30 | 62 | 4 | 0 | Removed. Use a single `error` |
| `errorMap` | 3 | 3 | 4 | 0 | Removed. Use `error` |
| `ZodError.errors` | 2 | 0 | 0 | 0 | Removed. Use `issues` |
| `.format()`, `.flatten()` | 5 | 1 | 1 | 1 each | Kept but not recommended (`z.treeifyError`) |
| `.default()` | 27 | 19 | 0 | 0 | Meaning changes (applies to the output type, validation is skipped if the input is `undefined`) |
| `._def` (OpenAPI generation) | 1 file | 0 | 0 | 0 | Internal structure changes (`_zod.def`). zod 4 provides `z.toJSONSchema()` directly |
| Files that import `zod` | 13 | 10 | 4 | 1 each | — |

- The scaffold `backend/src/openapi.ts` also reads `schema._def.typeName`. It must be rewritten when moving to the zod 4 API.
- The zod 4 package also ships the zod 3 API unchanged under the `zod/v3` path. Conversely, zod 3.25.76 also has the zod 4 API under the `zod/v4` path.

## 4. Package check

| Version | Release | 14-day rule |
|---|---|---|
| 4.6.6 | 2026-10-11 | Passed |
| 4.6.7 | 2026-10-12 | Passed |

- 4.6.6 release notes: with a git credential leaked on September 21, 6 malicious commits were pushed to `main` and reverted the same day, and they say none were published to npm. The npm provenance of 4.6.6 points to a commit from before the cleanup. Before approving the install, it is a good idea to check the provenance and the Socket score.

## 5. Candidates

| # | Candidate | Approach | Install | Verdict |
|---|---|---|---|---|
| A | Close the exposed spot | Add `.max()` to study-log `ids` (study-log PR). Make the central error handler send only the first 10 issue messages (#309 file). Add a "`z.array` with no length limit" warning to `standards-check` for arrays added in the future | None | **Recommended, right away** |
| B | Upgrade to zod 4.6.7 but import from `zod/v3` | In each app, `from 'zod'` → `from 'zod/v3'` (1 to 13 files). Code and OpenAPI generation stay as they are. The security alert is closed | Yes (user approval) | **Recommended, after A.** However, I could not confirm that array validation under the `zod/v3` path is also fixed. So A is the real countermeasure, and B is for the alert and the latest package |
| C | Move to the zod 4 API | Fix the usages in the table in section 3 and rewrite OpenAPI generation with `z.toJSONSchema()`. Start with workout-memo (rollout 1) | Same as B | On hold. There are dozens of places to change per app, so do it as per-app issues when there is no feature work |
| D | Stay on zod 3 and close the alerts | Close the Dependabot alerts as "risk accepted" | None | Not recommended. With A the real risk is small, but closing the alerts can bury the next advisory |

- A and B can be done together.
- The Dependabot zod grouped PRs currently fail at `npm ci` in app CI. This is because the lockfiles do not match (health-log: `Missing: zod@4.6.6 from lock file`). These PRs cannot be merged as they are.
  - B would work like this: the user regenerates the lockfile with `npm install --ignore-scripts zod@4.6.7`, then adds `npm run lockfiles:sync` (#303) and the import change.
  - If imports are not changed to `zod/v3`, type checking will probably also fail because of `required_error` and others. I could not confirm this part.
- Note: the body-parser, qs, and undici grouped PRs (`security-minor-patch`, #305) passed CI in the 3 apps I checked (health-log, workout-memo, study-log).

## Decisions

- On 2026-10-28 the user chose candidate A. Implementation is #326.
  - The central error handler responds with only the first 10 zod issue messages and the count of the rest.
  - `standards-check` warns about a `z.array` with no length limit. Of the 8 apps, only 1 spot in study-log is caught.
  - Add `.max()` to the study-log table-of-contents reorder `ids` (study-log PR).
- B (zod 4.6.7 + `zod/v3`) and C are not done this time. zod stays on 3.25.76. The Dependabot alerts are not closed (D is not done).
- #306 (exclude zod majors from Dependabot, close the zod PRs) is not done. The 8 open zod grouped PRs are left as they are.

## Decision change (#386)

- On 2026-11-01 the user decided to move all 8 apps to zod 4 (candidate C). The array length limit check from candidate A stays.
- App code is first moved to the `zod/v4` path of 3.25.76, and then the pinned version is raised to 4.6.7. So app code uses `from 'zod/v4'`. The same path and the same API are used with 4.6.7.
- Behavior differences found during the move are written in the [change record](../changes/386-zod-4-6-7.md).
