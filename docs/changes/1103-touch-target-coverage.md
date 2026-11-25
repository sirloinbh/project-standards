# #1103 Cover the 44px touch targets of SegmentedControl, close buttons and Switch with tests

The card assumed these five components had no touch rule. Reading the code showed the rules already exist, so no component code changes.

## Findings

| Component | Rule in the code | Touch size |
|---|---|---|
| `SegmentedControl` segments | `pointer-coarse:min-h-11` | 44px tall |
| `DialogContent`, `SheetContent`, `DrawerContent` close button | `pointer-coarse:size-11` | 44×44px |
| `Switch` | `pointer-coarse:after:-inset-3.5` on a 20×36px track with a 1px border | `::after` area (20 - 2) + 28 = 46px tall, (36 - 2) + 28 = 62px wide |

The sizes are calculated from the classes (the `::after` box is sized from the padding box, as in #415). They were not measured in a browser here.

## Decision (user, 2026-11-26)

A narrow desktop window with a mouse pointer keeps 36px on Button, Input and NativeSelect. The 44px rule applies to touch (coarse pointer) only; there is no `max-md:` rule. It is written in the new "Touch targets" section of `docs/ui-components.md`.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/{segmented-control,switch,dialog,sheet,drawer}.test.tsx` | One test each that pins the touch-size classes, so removing them fails a test |
| `docs/ui-components.md` | "Touch targets" section with the table's rules and the decision |

## Checks

- The new tests run in the app repo's Vitest (no packages are installed here). They are verified in a real app clone before merging.
