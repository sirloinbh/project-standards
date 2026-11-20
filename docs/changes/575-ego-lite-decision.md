# ego lite is the browser tool for signed-in apps (#575)

- `docs/tools.md`: a new section "ego lite for agent checks on signed-in apps": the install (a user step), how an agent runs `ego-browser` on Windows (the `.exe` path, one `.mjs` file per round, selectors, `finish`), the quirks seen (sign-in check wait, `page.fill()` on the AI textarea, screenshots, Radix dialog text, native confirm), the rules (read-only by default, ask before any write run, test entries deleted through the UI, own apps only, Bypass mode only for the run), and the evaluation result.
- The "When to use which" table now sends signed-in checks to ego lite and keeps Chrome DevTools MCP for pages without sign-in and for screenshots and traces ego lite cannot take; the old "macOS only" row is gone because ego lite runs on Windows (beta).
- Why: user decision on 2026-11-20 after the read-only and write runs on workout-memo (recorded on #575).
- Verification: `npm run check`.
