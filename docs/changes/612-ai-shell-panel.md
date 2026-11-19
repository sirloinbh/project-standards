# #612 AI shell panel in every web app (frontend half)

ADR-0017 puts an AI shell in every web app: a chat panel opened from the top bar. This is the managed React part in `templates/ui`. The `POST /api/chat` backend in `shared-ai` is not built yet (lane-7, #611); the contract below is what both sides follow.

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/lib/ai-chat.ts` | `aiOrigin` (the AI service address derived from the app's address and the root domain; null on local, IP, apex and foreign hosts), the stream parser and `streamChat`, `confirmToolCall` |
| `templates/ui/frontend/src/lib/use-ai-chat.ts` | The conversation state: messages, tool calls with their status, the confirmation step, the limit and error messages |
| `templates/ui/frontend/src/components/layout/ai-shell.tsx` | The top bar button and the side panel. Each tool call shows its app and name; a call that changes data shows Allow and Refuse |
| `templates/ui/frontend/src/components/layout/app-shell.tsx` | Shows `AiShell` in the top bar, before the app switcher |
| `templates/app/.prettierignore.tmpl` | The three new managed `lib` files |
| `*.test.ts(x)` | Origin rules, stream parsing across chunk borders, the request headers, read tool without a question, Allow, Refuse, the monthly limit message, a failed request |

## API contract with shared-ai (agreed with lane-7, 2026-11-20)

- Auth: the shared session cookie (`credentials: 'include'`). CORS on `ai.daysofme.com` allows only `<app>.daysofme.com` with credentials. Every POST carries `X-Requested-With: ai-shell`, and shared-ai refuses a POST without it (CSRF guard).
- `POST /api/chat`: body `{ conversationId?, messages: [{ role: 'user', content }], context: { app, page } }`. The panel sends only the new message; shared-ai keeps the history by `conversationId`. The answer is `text/event-stream`; each `data:` line is one JSON event:
  - `{"type":"text","delta":"..."}`
  - `{"type":"tool_call","id","app","tool","input","readOnly","needsConfirmation"}`
  - `{"type":"tool_result","id","ok","summary"}`
  - `{"type":"limit","message":"..."}` (monthly budget reached, ADR-0019)
  - `{"type":"error","message":"..."}`
  - `{"type":"done","conversationId":"..."}`
- The stream stays open while a call waits for confirmation; the `tool_result`, the rest of the answer and `done` arrive on the same stream after the owner answers. The panel does not accept a new message until `done`.
- `POST /api/chat/confirm`: body `{ conversationId, callId, approve }`, answer 204. A call with `readOnly: false` is not run until it is approved; a refused call yields a `tool_result` with `ok: false`.
- Errors before the stream starts are JSON `{ error: '<message>' }` with a non-2xx status.

## What was decided

- **The panel sits in `AppShell`.** All 8 apps already use it, so sync delivers the button without any app change. It is hidden where `aiOrigin` is null (local development, IP, foreign hosts), so existing app tests and dev runs do not change.
- **The server keeps the history.** The client sends one message per turn, so a long chat does not grow the request.
- **Confirmation is by a separate endpoint** and the stream stays open meanwhile, so the model loop continues on the same stream and a refused call is recorded by the server.
- **No Markdown rendering** in the first version: answers are plain text, which avoids a new dependency.

## Checks

- The managed files were copied into a clone of workout-memo (with the rest of `templates/ui` and the rendered `apps.ts`, `auth-config.ts`, `theme-config.ts` from the sync preview): `vitest` for the new tests and `layout/` passed (18 passed, 2 skipped), `tsc --noEmit` clean, `eslint --max-warnings 0` clean (one import order fix applied), Prettier is skipped for these files in apps through `.prettierignore`. The clone was restored with `git checkout` afterwards.
- `npm run check`: see the PR.

## Left for later

- The `shared-ai` chat route (lane-7 or a new issue), then "add it to workout-memo first" and the live check (the shell lists workouts, adds one after confirmation, audit client `ai-shell`).
