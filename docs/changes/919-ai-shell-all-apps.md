# AI shell on in all 8 apps (#919)

- `registry/projects.json`: `features.aiShell` is `true` for the 7 apps other than workout-memo. Every app has its first read tool (#711) and shared-ai lists them (#916 fix).
- `scripts/test/ai-shell-flag.test.mjs`: the comment and test name no longer say the flag is off by default; the test still checks each app's `AI_SHELL` value against the registry.
- Each sync PR renders `frontend/src/lib/ai-config.ts` with `AI_SHELL = true`. The AI button shows after the deploy.
- Results of the per-app read-only check are on #919.
