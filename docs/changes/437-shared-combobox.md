# #437 Free-text Combobox in the shared UI

## Background

workout-memo#124 (exercise name autocomplete) needed a field that suggests names but also accepts a new one. The shared UI had no Combobox, so workout-memo built its own (`frontend/src/components/combobox.tsx`). This moves it to the shared UI and adds what the issue asked for on top: titled option groups and an empty-result message.

## Decision

Implemented directly, with no package. shadcn's Combobox is cmdk + Popover: two more dependencies, and cmdk is a command menu that picks from its list rather than a field that keeps free text. The workout-memo version already followed the APG "list autocomplete with manual selection" pattern and had been used in production.

## Change

- `templates/ui/frontend/src/components/ui/combobox.tsx`: `Combobox`. Input with `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; a `listbox` with `option`s, and `group`s named by their titles. ↓/↑ move across groups, Enter picks without submitting the form, Esc closes only the list (also inside a dialog), Tab and blur leave the typed text. `emptyMessage` goes into a `role="status"` region. Options are `pointer-coarse:min-h-11` (44px). Design tokens only (`bg-popover`, `bg-accent`, `text-muted-foreground`), so dark mode follows.
- `combobox-filter.ts`: `filterComboboxGroups` (contains match ignoring spaces and case, hides the exact current value, caps the total, drops empty groups). Separate so the component file exports only components (react-refresh lint rule).
- `combobox.test.tsx`: 8 tests.
- `docs/ui-components.md`: list row. `scripts/test/fixtures/sync-snapshot.json`: the 3 files for the 8 UI apps.

## Verification

- In a workout-memo clone (temporary copies, removed afterwards): `vitest run src/components/ui/combobox.test.tsx` 8 passed, `tsc --noEmit` no errors, `eslint` and `prettier --check` clean.
- `npm run check` (Git Bash): see the PR.

## Follow-up

- workout-memo: after the sync PR lands, replace `frontend/src/components/combobox.tsx` and `combobox-filter.ts` with the shared one (an issue in workout-memo).
