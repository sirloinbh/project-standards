# 0007. shadcn/ui for UI components, lucide for icons, Fluent Emoji Flat for emoji

- Status: Accepted (issue #120)
- Date: 2026-10-22

## Context

- The UI components, icons, and emoji of the 8 apps must each be unified on one choice.
- workout-memo already follows the shadcn/ui approach. It keeps component sources directly in the repo (`button`, `field`, `dialog`) and uses `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, and Tailwind CSS 4. The other 7 apps have only `lucide-react`.
- Because of npm supply-chain attacks, new dependencies must follow these rules: pinned version, 14 days elapsed since release, `--ignore-scripts`, and pre-verification.

## Decision

1. **UI components are unified on shadcn/ui.** The user decided without a candidate survey (2026-10-22).
   - Component sources are kept directly in the repo. The central repo holds the source and syncs it to each app's `frontend/src/components/ui/` (#123).
   - The `npx shadcn` CLI is not used. It downloads and runs arbitrary packages, which does not fit the supply-chain rules. Write the components by hand from the sources in the official docs.
2. **Icons are unified on `lucide-react`.** It is the default icon set of shadcn/ui and the 8 apps already use it.
3. **Emoji are unified on the Flat style of Microsoft Fluent Emoji.** The user chose it from 4 candidates (2026-10-22).
   - No npm package is used. Only the SVGs actually used are brought into the central repo from commit `1ffb34c752ecf5d402f04cfb4b392c77f57c54bc` (2026-08-24) of the official repository `microsoft/fluentui-emoji`.
   - The license (MIT) notice file is kept with them.
   - The same 14-day rule applies when updating from the repository.

## Dependency table

Checked on 2026-10-22. Versions were chosen from those published before the cutoff date of 2026-10-08 (14 days earlier). `npm view` confirmed that no package has `preinstall`, `install`, `postinstall`, or `prepare` scripts.

| Package | Pinned version | Published | License | Repository | Dependencies | Notes |
|---|---|---|---|---|---|---|
| `radix-ui` | 1.7.0 | 2026-10-05 | MIT | github.com/radix-ui/primitives | 55 (`@radix-ui/*`) | The latest 1.8.1 (2026-10-12) has not passed 14 days |
| `class-variance-authority` | 0.7.1 | 2024-11-26 | Apache-2.0 | github.com/joe-bell/cva | 1 | Same as workout-memo |
| `clsx` | 2.1.1 | 2024-04-23 | MIT | github.com/lukeed/clsx | 0 | Same as workout-memo |
| `tailwind-merge` | 3.7.0 | 2026-09-12 | MIT | github.com/dcastil/tailwind-merge | 0 | Same as workout-memo |
| `tw-animate-css` | 1.4.0 | 2025-09-24 | MIT | github.com/Wombosvideo/tw-animate-css | 0 | Animation utilities |
| `sonner` | 2.0.8 | 2026-08-09 | MIT | github.com/emilkowalski/sonner | 0 | Toast |
| `vaul` | 1.1.2 | 2024-12-14 | MIT | github.com/emilkowalski/vaul | 1 | drawer |
| `lucide-react` | 1.52.0 | 2026-10-04 | ISC | github.com/lucide-icons/lucide | 0 | Raised from 0.468.0 (#137). Versions after the latest 1.53.0 have not passed 14 days |
| `tailwindcss` | 4.3.3 | 2026-07-16 | MIT | github.com/tailwindlabs/tailwindcss | — | Same as workout-memo |
| `@tailwindcss/vite` | 4.3.3 | 2026-07-16 | MIT | github.com/tailwindlabs/tailwindcss | — | Same as workout-memo |

`radix-ui` installs 55 sub-packages with it. These packages are also pinned in the lockfile, installed with `--ignore-scripts`, and checked by `ioc-scan` (#76).

## Icon and emoji usage rules

- **Icons:** Use `lucide-react` components.
  - Sizes follow the icon size steps in the design tokens (#121). Color is inherited from the text color as is (`currentColor`).
  - Icon buttons that carry meaning get an `aria-label`. Decorative icons use `aria-hidden`.
- **Emoji:** Use Fluent Emoji Flat SVGs as `<img>` instead of character emoji. This keeps the look from varying by OS.
  - Match the size to the text size. Do not change the colors inside the SVG.
  - If it carries meaning, put a Korean description in `alt`. If it is decorative, use `alt=""`.
- Do not introduce other icon sets, other emoji sources, or character emoji.

## Consequences

- The 8 apps use the same components, icons, and emoji, and differ only in app name and theme color.
- The 7 apps without Tailwind and common components must newly install the dependencies above. The user pre-approved the installation within the scope of #126 (conditions: the pinned versions in this table, 14 days elapsed, `--ignore-scripts`).
- When raising a version in the table, first open a PR that updates this ADR's table.
