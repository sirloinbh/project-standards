# #574 Jev judge helper in the Playwright e2e template

Implements ADR-0028: `expectJudged(target, questions, expected)` for e2e tests. The workout-memo pilot is a separate PR in that repo.

## Change

| File | Content |
|---|---|
| `templates/e2e/e2e/support/jev.ts` | The core, without a Playwright import: flat request (`model`, `state`, `questions`), request hash, fixture replay and recording, the gate (a wrong answer fails only at confidence 0.9 or more; `noul` by probability), the 24,000 character cap, and per-run caps of 50 calls and 400k input tokens. API errors, timeouts, a missing fixture, and a used-up budget are skips with an annotation, never failures. The key is read only from the Node environment and is never stored |
| `templates/e2e/e2e/support/judged.ts` | `expectJudged`: reads `locator.ariaSnapshot()`, calls the core, writes annotations, and fails on confident disagreement |
| `scripts/test/e2e-jev.test.mjs` | 8 tests: request shape and hash, the gate, API call and recording, offline replay, skips, errors and budget, size cap, missing expectation |
| `templates/app/.prettierignore.tmpl` | The two managed files and `e2e/fixtures/jev/` |
| `templates/app/knip.json` | `e2e/support/**` ignored, so an app that has no judged test yet does not fail knip |
| `docs/test-config.md` | How to use the helper |
| `scripts/test/fixtures/sync-snapshot.json` | The two new managed files (`UPDATE_SNAPSHOT=1`) |

## What was decided

- **`JEV_API_URL` is required for a real call.** The route (vendor API, OpenRouter, AIML API) is chosen with the key in #573; all three take the same flat body.
- **A keyed run always calls the API and rewrites the fixture**; no key means replay. This keeps recording simple and the replay deterministic.
- **Two files**, so the core can be tested centrally without Playwright.

## Checks

- `node --test scripts/test/e2e-jev.test.mjs`: 8 passed.
- Linted and type-checked in a clean workout-memo clone: ESLint, `tsc -p e2e/tsconfig.json`, Prettier clean.
- `npm run check`: see the PR.
- Not done: a run against the real API (needs the key from #573).
