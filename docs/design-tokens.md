# Design tokens

<!-- Generated file. Edit design/tokens.json, then regenerate with `npm run docs`. -->

Values shared by the 8 apps. Names follow the shadcn/ui and Tailwind CSS 4 conventions ([ADR-0007](adr/0007-shadcn-ui-icons-emoji.md)). The only thing that differs per app is the display name; all apps use the same black-and-white colors ([ADR-0008](adr/0008-neutral-light-dark.md)).

## Fonts

- Body and headings: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
- Monospace: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- Pretendard 1.3.9 (2023-11-05), SIL Open Font License 1.1. A single PretendardVariable.woff2 from the official release zip (the full variable font, 2.0MB) is placed in the @sirloinbh/design-tokens package and served directly. No external CDN is used (works offline and as a PWA, no external dependency). The dynamic subset is distributed only as an npm package or CDN, so it is not used. `font-display: swap`.

## Font sizes

| Name | Size | Line height | Used for |
|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem | Meta information (time, counts) |
| `text-sm` | 0.875rem (14px) | 1.25rem | Secondary and caption text, tables, form descriptions |
| `text-base` | 1rem (16px) | 1.6 | Body text (line height 1.6 for Korean readability) |
| `text-lg` | 1.125rem (18px) | 1.75rem | Heading level 4, emphasized body text |
| `text-xl` | 1.25rem (20px) | 1.75rem | Heading level 3 |
| `text-2xl` | 1.5rem (24px) | 2rem | Heading level 2, mobile heading level 1 |
| `text-3xl` | 1.875rem (30px) | 2.25rem | Desktop heading level 1 |

## Font weights

| Name | Value | Used for |
|---|---|---|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Buttons, menus, labels |
| `font-semibold` | 600 | Heading levels 2-4, card titles |
| `font-bold` | 700 | Heading level 1, emphasized numbers |

## Text styles (heading levels, body, caption)

The mobile size is the default, and from `md` (768px) up it grows to the size on the right.

| Style | Element | Mobile | md and up | Weight | Tracking | Color | Used for |
|---|---|---|---|---|---|---|---|
| `h1` | `h1` | 24px | 30px | 700 | -0.02em | `foreground` | Page title. One per page |
| `h2` | `h2` | 20px | 24px | 600 | -0.02em | `foreground` | Section title |
| `h3` | `h3` | 18px | 20px | 600 | -0.01em | `foreground` | Card and subsection titles |
| `h4` | `h4` | 16px | 18px | 600 | 0 | `foreground` | Small group title |
| `body` | `p` | 16px | 16px | 400 | 0 | `foreground` | Body text |
| `body-sm` | `p` | 14px | 14px | 400 | 0 | `foreground` | Tables, body text in narrow areas |
| `caption` | `p` | 14px | 14px | 400 | 0 | `muted-foreground` | Secondary and caption text, input descriptions |
| `meta` | `span` | 12px | 12px | 400 | 0 | `muted-foreground` | Meta information such as dates, times, and counts |

## Spacing

- Use spacing only in 4px units (Tailwind spacing 1 = 4px). Common values: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 6 (24px), 8 (32px), 12 (48px).

| Name | Mobile | md | lg | Used for |
|---|---|---|---|---|
| `page-x` | 1rem | 1.5rem | 2rem | Page side margins |
| `section-gap` | 1.5rem | 2rem | 2rem | Gap between sections |
| `stack-gap` | 0.75rem | 1rem | 1rem | Gap between cards and form items |
| `content-max` | 100% | 48rem | 72rem | Maximum body width |

## Corner radius

| Name | CSS variable | Value | px | Used for |
|---|---|---|---|---|
| `rounded-base` | `--radius` | `0.625rem` | 10 | Base value (shadcn/ui --radius) |
| `rounded-sm` | `--radius-sm` | `calc(var(--radius) - 4px)` | 6 | Badges, small input elements |
| `rounded-md` | `--radius-md` | `calc(var(--radius) - 2px)` | 8 | Buttons, input fields |
| `rounded-lg` | `--radius-lg` | `var(--radius)` | 10 | Cards, menus |
| `rounded-xl` | `--radius-xl` | `calc(var(--radius) + 4px)` | 14 | Modals, drawers |

## Shadows and borders

| Name | Used for |
|---|---|
| `shadow-xs` | Input fields |
| `shadow-sm` | Cards |
| `shadow-md` | Dropdown menus, popovers |
| `shadow-lg` | Modals, drawers |

- Borders are 1px, and only the colors border (dividers) and input (input fields) are used.

## Responsive

- Mobile first. Write the base styles for a 360px width, and add wider screens with the md and lg prefixes. The narrowest screen is 360px.
- On touch devices (pointer: coarse), tappable elements are at least 44px wide and tall. If the visible size is smaller, enlarge the tap area with padding.
- Fixed headers, bottom tabs, and drawers get inner padding of env(safe-area-inset-*) (together with viewport-fit=cover).
- Check changed screens at 390×844 (mobile) and 1440×900 (PC).

| Breakpoint | Min width | Used for |
|---|---|---|
| `sm` | 40rem (640px) | Large phone in landscape |
| `md` | 48rem (768px) | Tablet. From this width the LNB is fixed as a sidebar; narrower than this, it opens as a drawer |
| `lg` | 64rem (1024px) | Small laptop |
| `xl` | 80rem (1280px) | Desktop |

## Icon sizes

| Name | px | Used for |
|---|---|---|
| `sm` | 16 | Inside buttons and input fields |
| `md` | 20 | Menus, lists |
| `lg` | 24 | Empty states, emphasis |

## Stacking order (z-index)

| Name | Value | Used for |
|---|---|---|
| `base` | 0 |  |
| `sticky` | 10 | Fixed header, bottom tabs |
| `drawer` | 40 | LNB drawer, Sheet |
| `modal` | 50 | Dialog and its backdrop (shadcn/ui default) |
| `popover` | 60 | Dropdown menus, popovers (also open above modals) |
| `toast` | 70 | Sonner toast |

## Motion

- Fast 150ms, normal 200ms, slow 300ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- Use fast for hover and focus, normal for menus and toasts, and slow for modals and drawers. Turn animations off under prefers-reduced-motion.

## Loading indicators

- Skeleton: shadcn/ui Skeleton (bg-accent, animate-pulse). Draw it at the same size and shape as the real content (text lines, cards, lists). Use it on a screen that loads for the first time.
- Spinner: lucide-react Loader2Icon + animate-spin. Sizes are icon sm, md, and lg. Use it for a saving indicator inside a button and for short waits.
- Do not show a loading indicator for work that finishes within 300ms. Do not use a loading indicator that covers the whole screen.

## Colors

Values are in oklch. No app has its own colors. All 8 apps use the same black-and-white (neutral) colors, and apps are distinguished only by their display names (ADR-0008).

- Two modes, light and dark. By default it follows the system setting; if the user chooses, that choice is saved and a light or dark class is added to <html>. With no class, it follows prefers-color-scheme.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page background |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Default text |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Card background |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Card text |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Menu, popover, and modal background |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Menu and popover text |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Primary button, links, selected state (black shared by all apps) |
| `--primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | Text on the primary button |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Secondary button background |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Secondary button text |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Disabled and faint surfaces |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary and caption text (4.5:1 or more against a white background) |
| `--accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Hovered and selected menu background |
| `--accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Hovered and selected menu text |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | Delete and error |
| `--success` | `oklch(0.527 0.154 150.069)` | `oklch(0.723 0.219 149.579)` | Success and completion (Tailwind green-700, 4.5:1 or more against white text) |
| `--success-foreground` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Text on the success color |
| `--warning` | `oklch(0.828 0.189 84.429)` | `oklch(0.828 0.189 84.429)` | Warning (Tailwind amber-400) |
| `--warning-foreground` | `oklch(0.279 0.077 45.635)` | `oklch(0.279 0.077 45.635)` | Text on the warning color (Tailwind amber-950) |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Dividers, card borders |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Input field border |
| `--ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | Keyboard focus indicator |
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | LNB background |
| `--sidebar-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | LNB text |
| `--sidebar-primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | LNB selected item highlight |
| `--sidebar-primary-foreground` | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` | LNB selected item text |
| `--sidebar-accent` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | LNB hover background |
| `--sidebar-accent-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | LNB hover text |
| `--sidebar-border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | LNB divider |
| `--sidebar-ring` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` | LNB focus indicator |

## workout-memo legacy token mapping

Which new token each of workout-memo's existing tokens (frontend/src/theme.css) corresponds to. When the design system is applied (#126), switch according to this table.

| Legacy | New token | Note |
|---|---|---|
| `--color-primary` | --primary | Black shared by all apps. There are no per-app theme colors (ADR-0008) |
| `--color-on-primary` | --primary-foreground |  |
| `--color-accent` | --primary (lightened) or a chart color | The shadcn/ui accent is a hover background, so the meaning differs |
| `--color-focus` | --ring |  |
| `--color-ink` | --foreground |  |
| `--color-ink-muted` | --muted-foreground |  |
| `--color-ink-subtle` | --muted-foreground | Merge the two levels into one |
| `--color-link` | --primary | Links use the theme color |
| `--color-icon` | --muted-foreground |  |
| `--color-surface-sidebar` | --sidebar |  |
| `--color-surface-modal` | --popover |  |
| `--color-line / --color-line-soft` | --border | Merge the two levels into one |
| `--color-line-input` | --input |  |
| `--color-backdrop` | Modal backdrop bg-black/50 | shadcn/ui Dialog default |
| `--color-nav-active / -ink` | --sidebar-accent / --sidebar-accent-foreground |  |
| `--color-subtle / -line / -ink` | --secondary / --border / --secondary-foreground |  |
| `--color-danger / -ink` | --destructive |  |
| `--color-danger-surface / -line` | --destructive at 10% / 30% opacity | bg-destructive/10, border-destructive/30 |
| `--radius-sm 5px, md 6px, lg 9px, xl 12px` | 6px, 8px, 10px, 14px | Calculated from the shadcn/ui base value --radius 10px |
| `--shadow-card / --shadow-modal` | shadow-sm / shadow-lg | Tailwind default shadow |
| `Fonts DM Sans, Noto Sans KR` | Pretendard Variable |  |
