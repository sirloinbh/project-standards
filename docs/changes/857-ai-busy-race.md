# A cancelled AI turn no longer clears the busy state of the next one (#857)

- `templates/ui/frontend/src/lib/use-ai-chat.ts`: `send` clears `busy` in `finally` only when its own request is still the current one (`abort.current === controller`). `reset()` aborts the running request and lets the user send at once; the aborted request settles later and used to set `busy` to false while the new answer was still streaming, so a third message could be sent and two answers wrote into the last message.
- Test: `ai-shell.test.tsx` sends, resets, sends again, lets the cancelled request settle and checks that a third send is refused. It fails on the old hook and passes now (run in study-log, which has the vitest setup; lint, prettier and tsc also pass there).
