# #1022 Report an AI chat stream that ends without a done event

- Issue: [#1022](https://github.com/sirloinbh/project-standards/issues/1022)
- Branch: `fix/1022-chat-stream-cut-off`
- Related: #612, #1011

## Changes — 2026-11-23

`streamChat` in `templates/ui/frontend/src/lib/ai-chat.ts` remembers whether the turn ended with a `done`, `error` or `limit` event. A stream that closes cleanly without one now rejects with `ChatError('The answer was cut off. Try again.')`, so the AI shell shows an error instead of a half answer that looks finished. `error` and `limit` count as an end because the server sends no `done` after them.

## Verification

- `ai-chat.test.ts`: two new tests (a stream with only a `text` event rejects and still delivers the text; `error` and `limit` endings resolve). Run in a clean workout-memo clone: `ai-chat.test.ts` and `ai-shell.test.tsx` 21 passed; without the change the first new test fails. `npm run lint` and the frontend `typecheck` pass there.
- `npm run check`: passes.
