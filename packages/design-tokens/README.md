# @sirloinbh/design-tokens

Design tokens shared by the 8 apps. The source of the values is `design/tokens.json` in the central repo, and the tables are in `docs/design-tokens.md`. `tokens.css` and `tailwind.css` are generated files.

## Usage

A Tailwind CSS 4 app (`frontend/src/index.css`):

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@sirloinbh/design-tokens/tailwind.css';
```

An app without Tailwind imports only `@sirloinbh/design-tokens/tokens.css` and uses variables such as `var(--primary)`.

## Light and dark mode

- The colors are the same black and white in all 8 apps. There are no per-app theme colors (ADR-0008).
- `<html class="dark">` means dark and `<html class="light">` means light. With no class, the system setting (`prefers-color-scheme`) is followed.
- Tailwind's `dark:` utilities work under the same condition.

## What is included

| File | Contents |
|---|---|
| `tokens.css` | `:root` CSS variables (light colors, fonts, `--radius`, z-index, motion durations, layout spacing, touch target size), the colors for `.dark` and the system dark mode, and the Pretendard `@font-face` |
| `tailwind.css` | `tokens.css` + the `dark:` variant + the Tailwind theme (font sizes, breakpoints, colors, corners) + base styles (body, h1–h4) + the `text-body`, `text-body-sm`, `text-caption`, and `text-meta` utilities |
| `fonts/` | Pretendard Variable as the official dynamic subset: `pretendard.css` (92 `@font-face` rules with `unicode-range`), the 92 woff2 chunks in `woff2-dynamic-subset/`, and the license. A page downloads only the chunks its text uses. |

Apps do not override the tokens. If a change is needed, edit `design/tokens.json` in the central repo.
