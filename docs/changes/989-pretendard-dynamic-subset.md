# #989 Ship the Pretendard dynamic subset in design-tokens 1.1.0

- Issue: [#989](https://github.com/sirloinbh/project-standards/issues/989) (parent [#988](https://github.com/sirloinbh/project-standards/issues/988) Lean shared design tokens)
- Branch: `chore/989-pretendard-dynamic-subset`
- Downstream issue: sirloinbh/health-log#305

## Purpose

`fonts/pretendard.css` had one `@font-face` for the full `PretendardVariable.woff2` (2,057,688 bytes) with no `unicode-range`, so every app downloaded all of it on the first visit. Measured in health-log: a cold load of `/` transferred 2,057,988 bytes of font, about 10 times the app's gzipped JS.

User decision 2026-11-22 (relayed by the health-log coordinator, recorded on sirloinbh/health-log#305, option A): fix it in this package and release 1.1.0, keeping the family name, the weights and the OFL license.

## Change — 2026-11-22

- `packages/design-tokens/fonts/pretendard.css` is now the official `pretendardvariable-dynamic-subset.css` of Pretendard 1.3.9, unchanged. It has 92 `@font-face` rules, each with a `unicode-range`, pointing at `fonts/woff2-dynamic-subset/PretendardVariable.subset.{0..91}.woff2` (2,957,724 bytes in total, 20-38 kB each). The rules keep the family name `Pretendard Variable`, `font-weight: 45 920` and `font-display: swap`, so the token font stack and `tokens.css` are unchanged.
- `fonts/PretendardVariable.woff2` is removed. It was not in `exports`; apps reach the font only through `tokens.css`.
- Source: the release zip has no subset files (checked: `Pretendard-1.3.9.zip` matches the recorded sha256 and has only `web/variable/woff2/`). The subset comes from the authors' npm package `pretendard@1.3.9`, downloaded as a tarball (no install). Its sha512 matches the registry integrity, and its full `PretendardVariable.woff2` has the same sha256 as the zip's recorded hash. `design/tokens.json` records the tarball URL, its integrity and sha256, the CSS hash and all 92 chunk hashes; `docs/design-tokens.md` is regenerated. The OFL text stays `LICENSE-Pretendard.txt` from the zip, and the CSS keeps the authors' OFL notice.
- Tests (`scripts/test/packages.test.mjs`): the CSS, the license and every chunk match the recorded hashes; `fonts/` holds exactly the license, the CSS and the 92 recorded chunks (the full font is not bundled); every `@font-face` has the same family, weight range and display, has a `unicode-range`, and points at a bundled chunk, each chunk once.
- Package: version 1.1.0, a CHANGELOG entry, and the README `fonts/` row.

## Verification

- `npm run check`: passed (617 tests: 612 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed). `tokens.css` and `tailwind.css` regenerate unchanged.
- Mutation check: with the full `PretendardVariable.woff2` put back in `fonts/`, the hash test fails; with the `unicode-range` removed from the first rule, the hash test and the `@font-face` test fail. Both pass again after restoring.
- Browser check in health-log (Vite dev server, Chromium via Playwright, cold cache), with this `fonts/` folder copied over `node_modules/@sirloinbh/design-tokens/fonts` and restored afterwards:
  - `/` before: 1 font file, 2,057,988 bytes. After: 2 chunks (`subset.91`, `subset.86`), 64,312 bytes (-96.9%).
  - A specimen line with Latin, digits, Korean food names and symbols at weights 400/500/600/700: 11 chunks, 289,392 bytes (-85.9%).
  - Screenshots at 390x844 and 1440x900, before and after, compared pixel by pixel: every Latin and Hangul glyph and every glyph position is identical. The only difference is that `+ = @ ~ →`, which now come from other chunks than the text around them, are drawn 1 px lower (Chromium rounds the baseline per font file). The shapes and the horizontal spacing are the same.

## Review round 1 fixes — 2026-11-22

Round 1 (PR comment) found 3 blocking items, fixed in this commit:

- `packages/design-tokens/LICENSE.md` named the removed `fonts/PretendardVariable.woff2`. It now names `fonts/pretendard.css` and the subset chunks, with both sources.
- The CSS cost was not recorded. Measured with a health-log production build (`npm run build -w frontend`, these `fonts/` copied over `node_modules` and restored): `index-*.css` 55.63 kB / 10.31 kB gzip -> 103.61 kB / 25.37 kB gzip (+15.06 kB gzip, render-blocking). Font plus CSS on a cold `/`: about 2,068 kB -> about 90 kB (-95.7%). The build emits the 92 chunks (2,957,724 bytes) as separate assets; none is inlined (the smallest is 8,252 bytes, above Vite's 4 kB inline limit). Now in `design/tokens.json` (delivery), `CHANGELOG.md` and the PR.
- Offline behaviour: the delivery text said "works offline" without a qualifier. Offline, only chunks the service worker has already cached render in Pretendard; other characters use the next font in the stack. The delivery text and `CHANGELOG.md` now say so; `docs/design-tokens.md` is regenerated.
- `npm run check` after the fixes: passed (617 tests: 612 pass, 0 fail, 5 skipped; all other checks passed).

## Limits and follow-up

- Publishing is a user step: push the tag `design-tokens/v1.1.0` after this PR is merged (`publish.yml`). After the release, a follow-up PR raises `@sirloinbh/design-tokens` to 1.1.0 in `versions.json`, and each app picks it up through its sync PR.
- Pages with much Korean text load more chunks (about 20-38 kB each, by character frequency), still far below 2 MB.
