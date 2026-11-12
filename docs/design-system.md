# Design system (common part)

These are the screen rules all 8 apps follow. Values are in [design-tokens.md](design-tokens.md), and the reasoning behind decisions is in [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md), [ADR-0008](adr/0008-neutral-light-dark.md), and [ADR-0011](adr/0011-dark-only-option.md). The only things that differ per app are the **display name and the dark-only option (`features.darkOnly`)**. All 8 apps use the same black and white colors, and every app except those with dark-only turned on supports both light and dark modes.

## How to use tokens

- Import `@sirloinbh/design-tokens/tailwind.css` in the app's main CSS. Apps without Tailwind import only `tokens.css`. Usage examples are in the package README.
- Use colors by token name: `bg-primary`, `text-muted-foreground`, `border-border`. Do not write color codes directly.
- Do not override tokens (colors, fonts, sizes, spacing, corners, shadows) in an app. If one must change, edit `design/tokens.json` in the central repo.
- Tokens handle dark mode. Do not write colors separately per mode; use only token names. Use the `dark:` utility only when truly necessary.

## Light and dark modes

- By default it follows the system setting (`prefers-color-scheme`).
- If the user chooses a mode, that choice is saved (`localStorage`) and a `light` or `dark` class is put on `<html>`. So that colors do not flash and change on the first screen, the script that sets the class runs first in `<head>` (#124).
- With no class, it follows the system setting, so the right colors appear even if scripts are off.
- An app with the registry's `features.darkOnly` turned on always renders dark regardless of the saved value, and does not render the screen mode menu. App code reads the value through `DARK_ONLY` in `frontend/src/lib/theme-config.ts` (ADR-0011). Only workout-memo has it on for now.

## Components

1. For a new screen element, use the shadcn/ui components in `frontend/src/components/ui/` first. This folder holds centrally managed files. The list and how to turn it on for an app are in [Shared UI components](ui-components.md) (#123).
2. If you need something the shared components lack, build it in the app's own folder (`frontend/src/components/`). If several apps come to need it, open an issue in the central repo.
3. For layout (top menu, LNB, footer, modal, drawer, menu), use [Shared layout](layout.md) (#124).

## Text

- Use the `h1`–`h4` elements for headings. The default styles apply. There is one `h1` per page.
- Use `text-body` for body text and `text-body-sm` for narrow areas.
- Use `text-caption` for secondary and annotation text, and `text-meta` for meta information such as dates and counts.

## Icons and emoji

- Use only `lucide-react` for icons. Give meaningful icon buttons an `aria-label`.
- Use Fluent Emoji Flat SVGs as `<img>` for emoji. Do not use text emoji. If the emoji carries meaning, use an English description in `alt`; if it is decorative, use `alt=""`.

## Loading indicators

- Screens loading for the first time: a Skeleton shaped like the real content
- Saving inside a button, short waits: the `Loader2Icon` spinner
- Work that finishes within 300ms shows no indicator. Do not use loading that covers the whole screen.

## Responsive and accessibility

- Write mobile first. The narrowest screen is 360px. At `md` (768px) and above, the LNB turns into a sidebar.
- On touch devices, pressable elements are at least 44×44px.
- Menus, modals, and drawers must be openable and closable with the keyboard alone. Do not remove the focus indicator (`ring`).
- When you change a screen, check it at 390×844 (mobile) and 1440×900 (PC) and write the result in the PR.
- When you change the screen structure significantly, do a UX and accessibility audit (the `std-ux-audit` skill in app repos) before and after.

## Migrating existing apps

What workout-memo's legacy tokens (`--color-ink` and so on) correspond to among the new tokens is in the mapping table in [design-tokens.md](design-tokens.md). The migration is done per app in #126. The method decided in workout-memo (workout-memo#159) is as follows. Other apps follow the same order.

1. **Shared files:** From the center, with that app's `features.ui` turned on, run `node scripts/sync.mjs --dry-run --out <folder> --target sirloinbh/<app> --local <app>=<checkout>` and put the resulting `components/`, `lib/`, and `theme-init.js` into the app PR as they are. After the app PR is merged, merge the central `features.ui` PR, and the sync PR will contain only the manifest.
2. **Existing CSS:** Import it in `index.css` with `@import './style.css' layer(components);` so the shared components' utilities win. Delete the shell rules (sidebar, header, footer, modal frame), scope element rules (`button`, `p`, `h1`) inside `:where(.legacy)`, and then put the `legacy` class on the page body and modal content. Replace all hand-written colors with tokens.
3. **Contrast:** `--muted-foreground` text on a `--muted` background is 4.35:1 in light mode, short of AA (4.5:1). For text on such backgrounds, mix in more of the foreground color or use `--foreground`. For status badges, use `--success` and `--warning` lightly on the background only, and keep the text `--foreground`.
4. **Modal:** The shared Dialog blocks the screen behind it while open. Fix tests that operated the background with a modal open so they follow the real flow (close, then operate).
5. **Fake React tests:** In apps that had no Vitest, backend tests ran `main.tsx` with a fake React to check the screen (`backend/test/app-ui.test.ts`, study-log's `ui-harness.ts`). Once the shell changes to `AppShell` and React Router, this approach can no longer run. Move what only checked the shell to frontend Vitest tests and delete it. If there are many page checks, have the harness open pages with the old minimal shell (for tests) (study-log#110).
6. **Browser tests:** The menu name is "Main menu", and below 768px, "Open menu" opens the Sheet. Run accessibility and visual comparison checks after the modal and Sheet entrance animations finish (in a translucent in-between frame, the color of the screen behind is mixed in and contrast is measured wrongly).
