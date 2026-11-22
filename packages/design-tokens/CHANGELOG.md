# Changelog

## 1.1.0

- Pretendard is now the official dynamic subset: `fonts/pretendard.css` has 92 `@font-face` rules with `unicode-range`, one per woff2 chunk in `fonts/woff2-dynamic-subset/`, so a page downloads only the chunks its text uses (about 38 kB for Latin text instead of 2.0 MB). Same family name (`Pretendard Variable`), weight range (45-920), `font-display: swap`, and look. The single `fonts/PretendardVariable.woff2` is removed (#989).

## 1.0.0

- First version. Provides the tokens from `design/tokens.json` (#121) as CSS variables and a Tailwind CSS 4 theme. Includes Pretendard Variable 1.3.9 (#65).
- Black-and-white light and dark mode: dark colors that follow the `.dark` class and the system setting, and the `dark:` variant. There are no per-app theme colors (#122, ADR-0008).
