# Design-system component survey (#1174)

A read-only survey of the 8 apps (shallow clones of `main` on 2026-11-27) for components and patterns they build on their own that should become shared design-system components. It moves to the design-system repository with the rest of the UI documents (#1164). Input to the per-component cards under #1156.

## Method

- Compared `frontend/src/` of the 8 apps with the shared set in `components/ui/` ([ui-components.md](ui-components.md)), which every app already receives by sync.
- Looked for (1) the same file name in several apps, (2) the same role or ARIA pattern written by hand (`role="progressbar"`, `<table`, `<details`, `type="file"`, `aria-pressed`, "Try again"), (3) app-local wrappers around a shared component, (4) hand-copied helpers.
- Effort: S under a day, M one to three days, L more. Not a code review: the apps were not run.

## What is already shared (no work)

The shell is identical in all 8 apps (checked by hash): `sign-in.tsx`, `session-watch.ts`, `service-worker.ts`, `auth-origin.ts`, `theme-toggle.tsx`, `components/layout/*` (`app-shell`, `app-switcher`, `ai-shell`) and `lib/*` (`api`, `query`, `use-notice`, `use-ai-chat`). The 30 `components/ui/` files are the same everywhere. `health.ts` is identical in 7 apps (not workout-memo) and `live.ts` in 6 (not cert-manager or study-log). They need no component work; the design-system repository only has to keep delivering them.

## Candidates

Ordered by value: how many apps repeat it, how often the copies already differ, and how big the accessibility risk is.

| # | Candidate | Apps (own copies) | Proposed API | Effort |
|---|---|---|---|---|
| 1 | `ProgressBar` | cert-manager `study-plan.tsx`, money-ledger `goals.tsx`, study-log `coding-goal-list.tsx` `schedule-detail.tsx` `study-goal.tsx` `textbook-stats.tsx`, workout-memo `cardio-goals.tsx` (7 files in 4 apps) | `<ProgressBar label value max valueText />`: `role="progressbar"` with `aria-valuenow/min/max/valuetext`, track and fill from tokens | S |
| 2 | Data table: `Table` family | 22 hand-written `<table>` in health-log (4), life-journal (2), money-ledger (8), plan-routine (1), workout-memo (7); 8 different class strings; `<caption>` in only 13 places | `Table`, `TableCaption`, `TableHead`, `TableRow`, `TableCell` with `numeric`, `sticky`, and a wrapper that scrolls at 360px; `tabular-nums` for numbers. A `DataTable` with column definitions can come later | M |
| 3 | Loading and failure states | plan-routine `loading-region.tsx` and `retry-button.tsx`; study-log `loading.tsx` (`Loading`, `ButtonSpinner`); life-journal `load-failed.tsx`; dev-career-portfolio `item-list-page-notice.tsx` (`LoadErrorNotice`); cert-manager `use-load.ts`; "Try again" written by hand in all 8 apps (about 70 files) | `LoadingRegion` (name, shape: rows, card, cards), `LoadFailed` (error text, `onRetry`, pending state on the button), `RetryButton` that hands focus to the nearest named region when it unmounts (plan-routine's is the most complete) | M |
| 4 | `BusyButton` and `useBusy` | health-log `busy-button.tsx` (`aria-disabled` while saving, so keyboard focus is not lost); study-log `busy.ts` (one request at a time, remembers and restores focus, #75 #461 #118); plan-routine `focus-moves.ts`; health-log `return-focus.ts`; cert-manager `use-section-focus.ts` | `BusyButton` (extends `Button`, `busy` prop) and a `useBusy()` hook with the focus-restore step. Replaces the loose `disabled` plus spinner idiom | M |
| 5 | `ScoreField` (rating) | life-journal `score-field.tsx` (select, 0.5 to 5), plan-routine `diary-scores.tsx` (radio group 1 to 5 with Clear) | One component on radios for `min..max, step`, with a "none" state and `low`/`high` captions | S |
| 6 | Month calendar and activity heatmap | study-log `heatmap.tsx` + `month-calendar.ts` and `calendar.tsx`; workout-memo `workspace/activity-calendar.tsx` + `activity.ts` (`monthGrid`, `shadeLevel`); life-journal `calendar.tsx` + `calendar-month.ts` | `MonthCalendar` (grid with a per-day content slot, selected day via `aria-pressed`, previous and next month) and `Heatmap` (values, bands, legend text). `date-fields.ts` already has `monthWeeks` | M |
| 7 | Period navigation and period views | money-ledger `day-nav.ts`, `week.tsx`, `twelve-weeks.tsx`; workout-memo `workspace/period-controls.tsx` + `use-period-range.ts`; life-journal `week-dates.ts`, `journal-weeks.tsx`; cert-manager `week-range.ts`, `plan-weeks.tsx`; study-log `week-view.tsx`, `twelve-week-view.tsx`, `week-data.ts`; plan-routine `twelve-week.tsx` | A `PeriodNav` (day, week, 12 weeks; previous, next, today; range label) on top of `DateStepper`, plus a pure `periods` helper module (week start, 12-week range, label). The views stay in the apps | M to L |
| 8 | Charts: lazy loading and a failure boundary | money-ledger `lazy-chart.ts` + `chart-boundary.tsx` (5 charts); study-log `use-recharts.ts` (3 charts); workout-memo `chart-dot.tsx`, `workspace/volume-chart.tsx`; health-log `daily-bars.tsx` | `lazyChart` + `ChartBoundary` (message that points to the table with the same values, retry), chart tokens (series colors, axis, tooltip) and one `BarChart`/`LineChart` wrapper. recharts stays an optional peer | L |
| 9 | `Disclosure` | `<details>` in 14 files across 5 apps, each with its own classes; workout-memo `routines/previews.tsx` notes "components/ui has no accordion" | `Disclosure` (summary, `open`, chevron, 44px summary on touch). Native `<details>` underneath, so no new package | S |
| 10 | `FileField` and import and export pieces | study-log `file-field.tsx` (English label instead of the browser's "Choose file"; clears after pick); 12 `type="file"` inputs in 6 apps; blob download in 4 apps, 5 files (`backup-download.ts`, `export-text.ts`, `settings-data.ts`, `resume.tsx`, `export-section.tsx`); backup screens in life-journal, money-ledger, workout-memo | `FileField` (same reason as `DateField`: the browser's own control shows the browser language, #1138), a `downloadBlob(name, type, data)` helper, and a `BackupSection` (export, import with `ConfirmDialog`) | M |
| 11 | `ToggleChips` (single and multiple) | workout-memo `components/toggle-chips.tsx` (Radix toggle group, 44px on touch, radio semantics for `single`); hand-made `aria-pressed` chip rows in cert-manager, health-log, money-ledger, plan-routine, study-log | Promote workout-memo's component as it is. Distinct from `SegmentedControl` (exactly one) because it allows none or many | S |
| 12 | `List` and `ListItem` | workout-memo `components/list.tsx` (divided rows, 44px, actions at the end); the other apps repeat `divide-y` plus `min-h-11` rows by hand | Promote as it is, add `ListItemActions` | S |
| 13 | Item list page: toolbar, filter, sort | dev-career-portfolio `list-toolbar.tsx`, `list-view.ts`, `list-query.ts`, `item-list-page.tsx`; life-journal `items-table.tsx` (404 lines) and `filter-field.ts`; money-ledger `entry-filters.tsx`; study-log `study-log-search.tsx`, `keyword-search-card.tsx`; plan-routine `search.tsx` | `ListToolbar` (search, filter select, sort select, reset, result count in a live region) with URL-state helpers. Table or card rows stay with the page | M |
| 14 | `NavTabs` (route tabs) | life-journal `category-tabs.tsx` (links with `aria-current`, scrolls at 360px, 44px) | Promote and rename. money-ledger's `role="tablist"` in `asset-allocation.tsx` is the in-page variant: check whether `SegmentedControl` covers it | S |
| 15 | `ResponsiveModal` | workout-memo `components/modal.tsx` + `keyboard-inset.ts` (sheet or full screen below 640px, stays above the on-screen keyboard) and `use-confirm-delete.tsx`; study-log `delete-confirm.tsx` wraps `ConfirmDialog` | Fold the `layout` prop (`sheet`, `full`) and the `visualViewport` inset into `Dialog`. `useConfirmDelete` and `DeleteConfirm` become one `ConfirmDelete` | M |
| 16 | `PageHeader` duplicate | dev-career-portfolio `page-header.tsx` is its own copy next to the shared `components/ui/page-header.tsx` (it adds a back link) | Add `backTo` to the shared one and delete the copy | S |
| 17 | `ExternalLink` | dev-career-portfolio `out-link.tsx` and `web-link.ts` (only `http(s)`, new tab, accessible name "(opens in a new tab)") | Promote as it is | S |
| 18 | Safe Markdown renderer | life-journal `markdown.tsx` (own renderer, 130 lines, never builds HTML); study-log `memo.tsx` uses `react-markdown` (the only app with that package) | Pick one. Recommend the dependency-free renderer as `Markdown`, with a test list of the supported syntax | M |
| 19 | Text and number helpers (not components) | `plural.ts` in 3 apps (3 different versions); money-ledger `format.ts` (`formatWon`); `formatMinutes`, `formatDuration`, `formatDate` (33 uses); Seoul-date helpers in dev-career-portfolio and plan-routine `service-date.ts`, study-log and workout-memo `date.ts`, plan-routine `format-date.ts`; health-log `number-input.ts` (`parseAmount`, 15 significant digits) next to the shared `optionalNumber` | A `format` module (`plural`, `formatNumber`, `formatDuration`, `formatDate`, `serviceToday`) in the design-system lib. Merge `parseAmount` into `optionalNumber` | S to M |

## Patterns that stay in the apps

- Domain screens: money-ledger order book and mock trading, workout-memo plate calculator, rest timer and warm-up panels, study-log flashcards and PDF import, cert-manager word review, health-log nutrition label steps, plan-routine routine editor.
- Data hooks and form state (`form-state.tsx`, `use-checklist.ts`, `use-add-entry.ts`): they depend on each app's API.
- `StudyTimer` (study-log) is the only elapsed-time widget; wait for a second app before sharing.
- The checklist (plan-routine `checklist.tsx`, 310 lines) is used in plan-routine only; revisit it if health-log habits and the cert-manager study plan adopt it.

## Proposed cards for design-system (#1156)

In priority order. Each is small enough for one PR with the component, its test and a story (#1179):

1. `ProgressBar` (#1)
2. `Table` family (#2)
3. `LoadingRegion`, `LoadFailed`, `RetryButton` (#3)
4. `BusyButton` and `useBusy` (#4)
5. `Disclosure` (#9)
6. `ToggleChips` (#11) and `List`/`ListItem` (#12), promoted from workout-memo as they are
7. `PageHeader` `backTo`, `ExternalLink`, `NavTabs` (#16, #17, #14)
8. `ScoreField` (#5)
9. `FileField`, `downloadBlob`, `BackupSection` (#10)
10. `ResponsiveModal` and `ConfirmDelete` (#15)
11. `ListToolbar` (#13)
12. `MonthCalendar` and `Heatmap` (#6)
13. `PeriodNav` and the `periods` helpers (#7)
14. Lazy charts: `lazyChart`, `ChartBoundary`, chart tokens (#8)
15. `Markdown` (#18)
16. `format` helpers (#19)

After a component lands, one migration card per app removes that app's own copy; the design-system release sync (#1158) is the delivery path. Cards 1 to 7 are small, repeat in several apps and carry accessibility risk, so they come first. Cards 12 to 14 are large, so each should get a short API note before work starts.
