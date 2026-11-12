# #415 Make the shared Checkbox touch target 44px

Found in the real-browser touch e2e of sirloinbh/workout-memo#231 (measuring the `::after` size). The `::after` of `Checkbox` is `position: absolute`, so it is sized from the inside of the 1px border (the padding box). So `-inset-3.5` (14px) gave (16 - 2) + 14 x 2 = 42px.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/checkbox.tsx` | Changed `pointer-coarse:after:-inset-3.5` to `pointer-coarse:after:-inset-[15px]`. (16 - 2) + 15 x 2 = 44px. The calculation is written in a comment |
| `templates/ui/frontend/src/components/ui/checkbox.test.tsx` | Checks the box `size-4` and `border` and the 15px touch target classes |

## Other shared components

- `Checkbox` is the only component that widens its touch target with `::after`. There is no Radio component.
- `Button`, `Input`, `Select`, `DropdownMenu`, the `Dialog` and `Sheet` close buttons, and the `AppShell` menu enlarge the element itself with `pointer-coarse:min-h-11` and `size-11`. With `box-sizing: border-box` the border is inside the size, so it stays 44px.

## What to do in apps

- After the sync PR is merged, the touch target that an app overrode on `Checkbox` with `className` (for example sirloinbh/workout-memo `097559e`) can be deleted. Deleting it is done in each app repo.

## Checks

- Real browser measurement (headless Chrome): drew a 16px box with a 1px border using the same CSS that Tailwind generates, and measured with `getComputedStyle(el, '::after')`.
  - Before (`inset: calc(var(--spacing) * -3.5)`): box 16x16, touch target 42x42px
  - After (`inset: -15px`): box 16x16, touch target 44x44px
- `checkbox.test.tsx` runs in the app repo's Vitest. No packages are installed in this repo, so I could not run it here.
- `npm run check`: passed (518 of 523 tests passed, 0 failed, 5 skipped).
