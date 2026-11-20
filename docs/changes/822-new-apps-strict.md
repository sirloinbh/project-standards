# #822 New apps start with requireBinding: true

workout-memo is strict and live (workout-memo#398, deployed as 518a462, a live tool call through shared-ai passed). The scaffold has no tool wiring: a new app copies the `registerToolRoutes` call from `docs/ai-tools.md` and from the header of the managed `standard/tools.ts`, so those two show it now.

## Change

| File | Content |
|---|---|
| `templates/app/backend/src/standard/tools.ts` | The usage comment at the top passes `requireBinding: true` (a comment only; managed file, synced to the apps) |
| `docs/ai-tools.md` | The serving example passes `requireBinding: true`; the deploy-order note says a new app starts strict |

## What was decided

- **The default of `requireBinding` stays `false`.** Flipping it would make any app that calls `registerToolRoutes` without the option strict on the next sync. Only workout-memo calls it today and it already sets the flag; the default can flip when a second app has tools.

## Checks

- `npm run check`: see the PR.
