# Repeated UI and shared code in the frontends of the 8 apps (#242)

Surveyed on 2026-10-28. I read `frontend/src` on `origin/main` of the 8 app repos with `git show`. No code was changed. Adopted candidates are listed under "Decisions" at the bottom and will be registered as implementation issues.

## 1. Current state of the apps

- `components/ui/` (15 files), `components/layout/`, `lib/theme.ts`, and `lib/utils.ts` are identical in all 8 apps (sync-managed, [ui-components.md](../ui-components.md)).
- 3 apps have feature screens. The other 5 only have the status check screen in `app.tsx` (`health.ts`).

| App | Screen files (`.tsx`, excluding common components) | Use of common components | Server state |
|---|---|---|---|
| workout-memo | 7 | Partial. `<button>` 57 places, `<Button>` 6 places, `<input>` 32 places. `Modal` (wraps the common `Dialog`) on top of `.legacy` styles | TanStack Query in 8 places + separate `fetch` wrapper functions in 5 files |
| study-log | 16 | Barely used. `<button>` 68 places, `<Button>` 0 places, `<input>` 23 places | Direct `useState` and `useEffect` (`useEffect` in 43 places) |
| plan-routine | 2 (`app.tsx`, `routines.tsx`) | Fully used. `<Button>` 8 places, `<Card>` 9 places, 0 raw `<button>` or `<input>` | Direct `useState` and `useEffect` |

## 2. Repeated screen elements

| Element | workout-memo | study-log | plan-routine | Common component |
|---|---|---|---|---|
| Delete confirmation | Browser `confirm()` in 3 places | A 2-step button that shows a "삭제 확인" (Confirm delete) button on the same line once more (records, keywords, retrospectives screens, etc.) | None (archive) | **None** |
| Result notification | 25 paragraphs with `role="status"` and `role="alert"` | `setNotice({ kind, text })` state + 42 `role` paragraphs (same code on each screen) | 5 `role` paragraphs | `toast` (sonner) exists, in-screen notice paragraph is **missing** |
| Loading | The text "불러오는 중" (Loading) in 16 places | 18 places | 1 place | `Skeleton` and `Spinner` exist, but **no feature screen uses them** |
| Empty list | Text paragraph | Text paragraph | `EmptyState` | `EmptyState` exists |
| Date input | `<input type="date">` in 9 places | 7 places + month calendar (`month-calendar.ts`) | None | **None** (the native input is enough) |
| Date range | `date-range.ts` | Period navigation | Cycle (daily, weekly, 4 weeks, 12 weeks) | None |
| Chart | Hand-drawn SVG in 2 places | `recharts` (study time), heatmap (`Heatmap.tsx`) | None | **None** |
| Table | `<table>` in 3 places | None | None | None |
| Form field (label + input + error) | `components/field.tsx` | Written directly per screen | `Input` + `Label` | Only `Input` and `Label`. No combined component |

## 3. Repeated frontend code

| Code | Where | Difference |
|---|---|---|
| API request function (`fetch` -> JSON, on failure throw the server's Korean `error`, on connection failure "서버에 연결할 수 없습니다" (Cannot connect to the server)) | study-log `api.ts` (status code in `RequestError`, `204` handling), plan-routine `api.ts` (no status code), workout-memo separately in 5 files | They do the same job; only status code and `204` handling differ |
| Server status check (`Health` type and wording in `health.ts`) | 8 apps | Same. Outside sync management, so copied per app |
| Handling date strings (add/subtract `YYYY-MM-DD`, week start) | workout-memo `date.ts`, study-log `month-calendar.ts` | Each implemented its own. Both compute on strings to avoid the `Date` time zone pitfall |
| `localStorage` read and write | `lib/theme.ts` in all 3 apps (same) + workout-memo screen state | The theme is already shared |
| Number display (`toFixed`) | workout-memo, 4 places | One app only |

## 4. Candidates for sharing

| # | Candidate | Approach | Verdict |
|---|---|---|---|
| A | API request function `lib/api.ts` (`requestJson`, `RequestError` (status code), `204`) | Put in `templates/ui/` and sync. Use the study-log version as the base. Pairs with #241 candidate A (backend error format) | **Recommended** |
| B | Delete confirmation dialog `ConfirmDialog` | `templates/ui/`. Title, description, confirm (destructive button), and cancel on top of the common `Dialog`. Replaces the 3 `confirm()` calls in workout-memo | **Recommended** |
| C | In-screen notice `Notice` (`role="status"`/`"alert"`) + `useNotice()` hook | `templates/ui/`. Reduces the same code in 42 places in study-log | **Recommended** |
| D | Use `Skeleton` and `Spinner` for loading screens | The components already exist. Write "`SkeletonList` for lists, `Spinner` inside buttons" in the rules document (`ui-components.md`), and make the per-app changes app issues | **Recommended** (docs + app issues) |
| E | Make `health.ts` a sync-managed file | `templates/ui/`. All 8 apps are the same, so it can be moved right away | **Recommended** (small) |
| F | Date string helpers `lib/date.ts` (`addDays`, `startOfWeek`, `serviceToday`) | `templates/ui/`. Same rule as the backend `serviceDate` in #241 candidate A | On hold. The two apps' implementations cover different scopes, so the common part must be narrowed first |
| G | Chart component | — | Not doing. Two apps use charts and they are of different kinds. If a third app needs one, revisit with study-log's `recharts` as the base |
| H | Replace raw `<button>` and `<input>` in study-log and workout-memo with common components | App repo issue (screen appearance changes, so screen checks are needed) | On hold. Land B and C first, and decide in that PR what scope to change together |

## Decisions

- On 2026-10-28 the user adopted the recommendations in section 4.
- A, E: #310
- B, C: #311
- D: #312
- F, H: on hold
- G: not doing
