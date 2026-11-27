# Changelog

## 1.1.1

- Built and released from `sirloinbh/design-system` from now on (#1165). This copy is kept only until #1170 removes it, and its version follows the release so `versions.json` and the scaffold check agree. Token values, fonts and exports are unchanged.

## 1.1.0

- Pretendard is now the official dynamic subset: `fonts/pretendard.css` has 92 `@font-face` rules with `unicode-range`, one per woff2 chunk in `fonts/woff2-dynamic-subset/`, so a page downloads only the chunks its text uses (about 38 kB for Latin text instead of 2.0 MB). Same family name (`Pretendard Variable`), weight range (45-920) and `font-display: swap`; Latin and Hangul render identically (a symbol drawn from a different chunk than the text around it can sit 1 px lower in Chromium). The single `fonts/PretendardVariable.woff2` is removed. The 92 rules add about 15 kB gzip to an app's CSS (health-log: 10.31 -> 25.37 kB gzip), far less than the 2 MB saved. Offline, only chunks already cached render in Pretendard; other characters use the next font in the stack (#989).

## 1.0.0

- First version. Provides the tokens from `design/tokens.json` (#121) as CSS variables and a Tailwind CSS 4 theme. Includes Pretendard Variable 1.3.9 (#65).
- Black-and-white light and dark mode: dark colors that follow the `.dark` class and the system setting, and the `dark:` variant. There are no per-app theme colors (#122, ADR-0008).
