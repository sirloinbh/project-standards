# Shared UI components

These are the shadcn/ui base components all 8 apps use in the same form (#123, [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)). The source is `templates/ui/`, and it is synced as centrally managed files to each app's `frontend/src/components/ui/`. Screen rules follow the [design system](design-system.md).

## List

| File | Exports | Note |
|---|---|---|
| `button.tsx` | `Button`, `buttonVariants` | `variant`: default, secondary, outline, ghost, destructive, link. `size`: default, sm, lg, icon. Use `asChild` to make a link look like a button |
| `input.tsx` | `Input` | Error border when `aria-invalid` |
| `input-styles.ts` | `fieldClasses` | The class list Input, Textarea and NativeSelect share. Use it instead of copying the classes (#688) |
| `textarea.tsx` | `Textarea` | Multi-line field in the Input look. `limit` adds a counter linked by `aria-describedby`; over the limit it says "N over the limit" in words and sets `aria-invalid`. Soft limit: typing is not blocked (#688) |
| `native-select.tsx` | `NativeSelect` | The browser's `<select>` in the Input look, with `<option>` children. For a short list on a form; use `Select` for a styled list (#688) |
| `label.tsx` | `Label` | Connect it to the input with `htmlFor` |
| `checkbox.tsx` | `Checkbox` | The box is 16px, and on touch devices there is an invisible 44px press area |
| `combobox.tsx`, `combobox-filter.ts` | `Combobox`; `ComboboxGroup`, `filterComboboxGroups`, `maxComboboxOptions`, `looseText` | Text field with suggestions (WAI-ARIA APG combobox, #437). Free text is allowed. `options` is a list of strings, or titled groups (for example "Recently used"). ↓/↑ move, Enter picks without submitting the form, Esc closes, Tab leaves with the typed text. Filtering ignores spaces and letter case, and shows at most 8 (`maxOptions`). `emptyMessage` is announced when nothing matches. `listLabel` names the list and must not contain the field's label. Options are 44px tall on touch screens. No package |
| `select.tsx` | `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator` | Can be opened and chosen with the keyboard |
| `switch.tsx` | `Switch` | A setting that applies at once. Use `Checkbox` for a value saved with a form. 44px tap area on touch screens (#689) |
| `segmented-control.tsx` | `SegmentedControl`, `SegmentOption` | One choice out of a few (period tabs). Exactly one stays selected; a click on the current one only calls `onReselect` (#689) |
| `number-input.tsx`, `number-step.ts` | `NumberInput`, `NumberValueInput`; `stepValue`, `optionalNumber` | A number field with − and + buttons. The value stays text so typing "12." is not rewritten; `NumberValueInput` keeps a stored number, and with `allowEmpty` an emptied field stays `undefined` instead of 0 (#972). `optionalNumber` reads typed text for a form: empty is `null`, text that is not a plain decimal is `NaN` for the schema to report. The limit uses `aria-disabled`, so focus stays on the button (#689) |
| `date-stepper.tsx` | `DateStepper`, `RangeSummary` | The anchor date of a period with optional previous and next buttons, and the period's first and last day (#689) |
| `stat-card.tsx` | `StatCard` | One summary number in a row of cards: label, value with unit, note, icon (#689) |
| `page-header.tsx` | `PageHeader` | The top of a page: optional eyebrow, h1, optional description and actions. `headingRef` lets the page focus the h1; `id` defaults to `page-title` (#689) |
| `alert-banner.tsx` | `AlertBanner` | A failure or warning that needs attention, with an optional `action`. `role="alert"`. For a progress or success line use `Notice` (#689) |
| `field.tsx`, `field-props.ts` | `FieldError`; `fieldErrorId`, `invalidProps` | The message under a control, linked to it with `aria-invalid` and `aria-describedby` through `invalidProps(name, message)` (#689) |
| `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | `CardTitle` is `h3` by default; match the level with `asHeading` |
| `badge.tsx` | `Badge`, `badgeVariants` | `variant`: default, secondary, success, warning, destructive, outline |
| `sonner.tsx` | `Toaster`, `toast` | Place `<Toaster />` once at the app root. The theme follows the `light` or `dark` class on `<html>`, or the system setting if there is none |
| `skeleton.tsx` | `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonList` | Hidden from screen readers. Put `aria-busy` and a name on the loading area |
| `spinner.tsx` | `Spinner`, `spinnerVariants` | `size`: sm (16px), md (24px), lg (32px). `role="status"`, default name "Loading" |
| `empty-state.tsx` | `EmptyState` | Icon, title, description, next action (button). The title level is `headingLevel` |
| `dialog.tsx` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose` | Modal. [Shared layout](layout.md) |
| `confirm-dialog.tsx` | `ConfirmDialog` | Asks before an irreversible action such as delete (#311). Use it instead of the browser `confirm()`. Open it with `trigger` (the opening button) or `open` and `onOpenChange`. If opened without a `trigger`, there is nowhere for focus to return after closing, so specify it with `returnFocusRef` (#356). If `onConfirm` returns a Promise, the buttons are blocked until it finishes; on success it closes, and on failure it stays open. The default labels are "Delete" and "Cancel", and when `destructive` (default `true`), the confirm button has the destructive look |
| `notice.tsx` | `Notice` | In-screen notification (#311). `role="status"` when `notice.kind` is `status`, `role="alert"` when `error`. Its live regions stay in the page, empty until there is a message, so the first message is announced (#684). For passing notifications not tied to one place, use `toast` |
| `sheet.tsx` | `Sheet`, `SheetTrigger`, `SheetContent` (`side`), `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose` | Edge panel |
| `drawer.tsx` | `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerClose` | Bottom panel (vaul). Focus moves inside when opened |
| `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup` | Button menu |
| `../lib/utils.ts` | `cn` | Merges class names (shadcn/ui convention) |

Why this is distributed by sync and not by a shadcn registry: [ADR-0020](adr/0020-shared-ui-stays-on-sync.md).

A `*.test.tsx` (Vitest, Testing Library) for each component is synced along with it and runs in the app's `npm test`.

## Loading screens

While loading, feature screens do not leave a blank screen or only text ("Loading…"); they use the shared components (#312).

| Situation | What to use |
|---|---|
| Loading a list or table for the first time | `SkeletonList` (row shape), or `SkeletonCard` for a card list. Put `aria-busy="true"` and a name (`aria-label`) on the loading area |
| A block of text | `SkeletonText` |
| Waiting for a save or delete after pressing a button | `Spinner size="sm"` inside the button, and `disabled`. `ConfirmDialog` does this by itself |
| When the whole screen would have to be blocked | Do not use it. Show the existing content as is and mark only the parts that change |

- If loading fails, show the reason with `Notice` (`role="alert"`).

## Shared helpers

| File | Exports | Note |
|---|---|---|
| `frontend/src/lib/api.ts` | `requestJson`, `requestForm`, `RequestError`, `onUnauthorized` | App API requests (#310). On success, the JSON body, or `undefined` for `204`; a 2xx answer that is not JSON rejects with kind `body` (#682). On failure, a `RequestError` carrying the server's `error` message and `status` (a connection failure is "Cannot reach the server", with no `status`). `error.kind` tells the failure apart: `network`, `timeout` (default 30 s, `timeoutMs`, `0` turns it off), `abort` (the caller's `signal`), `http` and `body`. `error.fields` holds the per-field messages of a validation `400` (`{ path, message }`, empty otherwise, #674), so a form places each message by its path. `requestForm(path, formData)` sends a multipart upload. `onUnauthorized(handler)` registers the one function called on any `401` from these two (the sign-in gate uses it, see below). The server-side counterpart is `backend/src/standard/http.ts` (#309) |
| `frontend/src/lib/query.ts` | `createQueryClient`, `apiKey`, `useApiQuery`, `useApiMutation`, `shouldRetry` | The data-loading layer on `@tanstack/react-query` (ADR-0027, #788). Synced to apps with `features.query` on (all 8). `createQueryClient()` once in `app.tsx`: data is fresh for 30 s, a failed load is retried once and only for network, timeout and 5xx failures, a focused window refetches stale data, and writes are never retried. `useApiQuery<T>(apiKey('/api/goals'), '/api/goals')` loads and passes the abort signal to `requestJson`. `useApiMutation(request, { invalidate: [apiKey('/api/goals')] })` writes; after success it cancels the reads still running under each `invalidate` key (#1008, so none can answer with data from before the write), refetches them, and stays pending until they end. `apiKey('/api/goals', 7)` is `['/api/goals', 7]`, and invalidating the shorter key refreshes every key that starts with it. The scaffold keeps a plain `new QueryClient()` (a template cannot be conditional) |
| `frontend/src/session-watch.ts`, `frontend/src/sign-in.tsx` | `createUnauthorizedHandler`, `SignInGate`, `AccountActions` | A session that ends during use sends the visitor to sign-in once (#596, #669). If sign-in says "signed in" and the API still answers `401`, a second redirect within 60 s is refused and the gate shows "Signing in did not finish" with a retry button, instead of two pages redirecting each other forever |
| `frontend/src/lib/use-notice.ts` | `useNotice`, `errorText`, `NoticeValue` | `const { notice, status, error, clear } = useNotice()`. `error(e)` extracts the message from the thrown value (the server's text for a `RequestError`). On screen, use `<Notice notice={notice} />` |
| `frontend/src/health.ts` | `Health`, `healthText`, `useHealth` | Server status display text. `useHealth()` checks `GET /api/health` on mount, again every 10 s while it fails and when the browser comes back online, and aborts on unmount (it stays on its own effect, not the query layer: ADR-0027). 7 apps were using the same file. workout-memo does not use it, so it was left out with `allowedDifferences` |

- Screen code does not call `fetch` directly. A screen loads with `useApiQuery` and saves with `useApiMutation` (both on `requestJson`); it calls `requestJson` itself only for a one-off call that should not go through the query cache. Do not write a `useEffect` loading loop. To handle cases differently by status, such as when a deleted item is already gone (`404`), branch with `error instanceof RequestError && error.status === 404`.
- Move study-log and plan-routine's `frontend/src/api.ts` and workout-memo's per-screen `fetch` to `lib/api.ts` in the app repo (see the per-app guidance in the change log below).

## Turning it on for an app

Components are synced only to apps whose `features.ui` is `true` in the registry, because adding them to an app without the dependencies would break the build. With the design system rollout (#126), all 8 apps are `true`. For a new app or an app that has the feature off, turn it on in this order.

1. **[User approval]** Install dependencies: `radix-ui@1.7.0 sonner@2.0.8 vaul@1.1.2 tw-animate-css@1.4.0` (all pinned versions from the table in the [dependency policy](dependency-policy.md), `--ignore-scripts`). `clsx`, `tailwind-merge`, `class-variance-authority`, and `lucide-react` must also be present.
2. Add `@import 'tw-animate-css';` to `frontend/src/index.css` ([design tokens README](../packages/design-tokens/README.md)).
3. For any of the app's existing `components/ui/` files whose names collide, replace them with the shared components or move them to another folder. Sync overwrites the same path.
4. Open a PR in the center that changes the app's `features.ui` to `true` in `registry/projects.json`. The components come in with the next sync PR.

A new project is registered with `features.ui: true` from the start. The scaffold's `package.json` includes the dependencies above.

## Touch targets

- Touch screens (`pointer-coarse`) get at least 44×44px (`--touch-target`) on every control: Button, Input, NativeSelect, SegmentedControl segments (`pointer-coarse:min-h-11`), the Dialog, Sheet and Drawer close buttons (`pointer-coarse:size-11`), and Checkbox and Switch (an invisible `::after` area: 44px and 46×62px).
- A narrow desktop window with a mouse pointer keeps 36px on Button, Input and NativeSelect. There is no `max-md:` rule; the 44px rule follows the pointer, not the viewport width (user decision, 2026-11-26, #1103).

## Verification results (2026-10-22)

We connected workout-memo's installed copy and the packages above (installed in a temporary working folder with `--ignore-scripts`) to a virtual slot 99 app and verified.

- 23 tests, `tsc`, and ESLint pass
- Text contrast of buttons, badges, labels, and descriptions measured in the installed Chrome: light minimum 4.74:1, dark minimum 6.02:1 (WCAG AA 4.5:1 or more)
- Touch device emulation (360px): buttons, inputs, and select boxes are 44px tall, and the checkbox press area is 44px
- Opening and choosing in the select box with the keyboard, toast display
- 0px horizontal overflow at 360px and 1280px, in both light and dark

| | Light | Dark |
|---|---|---|
| 360px | ![360px light](ui-components/ui-360-light.png) | ![360px dark](ui-components/ui-360-dark.png) |
| 1280px | ![1280px light](ui-components/ui-1280-light.png) | ![1280px dark](ui-components/ui-1280-dark.png) |
