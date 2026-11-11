# 455 standards-check messages in English

Part of #455.

## What changed

- Translated all user-facing messages, group labels, rule labels, and the "How to fix" text in `scripts/standards-check.mjs` (copied into apps as `.standards/check.mjs`) to English.
- Updated the exact-string assertions in `scripts/test/standards-check.test.mjs`.

## Kept as is

- The `<Korean message>` placeholder text in the API error-shape warning now reads in English, but the rule itself is unchanged: app error messages are still Korean.
- Nothing in this group is matched by other tools, so no Korean was kept.

## Verification

- `node --test scripts/test/standards-check.test.mjs scripts/test/scaffold.test.mjs` passes.
- No Hangul is left in the two files.
- `npm run check` (see the PR for the result).
