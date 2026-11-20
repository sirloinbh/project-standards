# 0028. e2e tests ask Jev typed questions through a helper; PR CI replays recorded answers and keeps no real key

- Status: Accepted (issue #572, parent #571). Proposed on 2026-11-20; accepted on 2026-11-21 after the Korean accuracy run below (all 25 confident answers agreed with the labels).
- Date: 2026-11-20
- Builds on: [ADR-0010](0010-claude-api-key-ssm.md) (CI keeps no real AI key; tests use a fake), [ADR-0014](0014-app-secrets-ssm-paths.md) (SSM paths), [ADR-0019](0019-claude-call-tracking-without-gateway.md) (no LLM gateway for now)

## Context

- Playwright tests (all 8 apps have `features.e2e`, #569) check exact selectors and text. Some questions need a judgment: "is this error message understandable?", "does the empty state say what to do?", "does the summary match the entered workout?".
- Jev (TypeSafe AI) answers typed questions about text or JSON. Facts checked on 2026-11-20 in the Cloudflare, OpenRouter, and AIML API pages. The vendor's own API reference, `docs.typesafe.ai/api`, was read on 2026-11-21 (#572); its route is under "Route" below:

  | Fact | Value |
  |---|---|
  | Question types | `noul` (yes/no: answer `noul` is the probability of yes, no `confidence` field), `choice` (1 to 255 options: `choice`, `probabilities` per option, `confidence`), `score` (2 to 10 ordered levels: fractional expected level, `probabilities`, `confidence`). `box` needs an image and is not used |
  | Request | `model`, `state` (the text or JSON), `questions` (each with `type`, `instructions`, and `criteria` for choice, score, and optionally noul). The Cloudflare route wraps it in `input` |
  | Response | `answers` keyed by question, `usage` with input and output tokens |
  | `confidence` | How concentrated the probability distribution is. It does not say the answer is correct (the vendor states this) |
  | Price | $0.042 per 1M input tokens, output free (Cloudflare and OpenRouter pages) |
  | Limits | 64k tokens per request and 32k for `state` plus one question (OpenRouter's long-context mode raises both to 262k). Text only (images are beta). English first. Weak at counting, arithmetic, date comparison, and multi-step reasoning |
  | Routes | The vendor's own API, OpenRouter (`/api/alpha/decisions`), AIML API (`/v1/decisions`), and Cloudflare Workers AI. Field names differ slightly per route |

- ADR-0010 says CI keeps no real AI key. A Jev call in pull request CI would break that rule and make PR results depend on a third party and on an early-access model.

## Decision

Jev is a **judge for a few non-deterministic checks**, called by one helper in the e2e template. Real calls happen only on the developer's PC (or an agent's) with the key; PR CI replays recorded answers.

| Item | Decision |
|---|---|
| What it judges | Only qualities a selector cannot check: message clarity, whether an empty state explains the next step, whether a summary text matches the data shown. **Never** counting, sums, dates, or ordering (normal assertions do those). 3 to 5 checks per app, 2 to 3 in the workout-memo pilot (#574) |
| Input | The ARIA snapshot (`locator.ariaSnapshot()`) of the region under test, not the whole page, or the region's `innerText` when a snapshot is noisy. Capped at 24,000 characters (about 16k tokens for Korean), so `state` plus one question stays under the 32k limit. The helper fails the check (not the judge) when the cap is exceeded |
| Question wording | Instructions and criteria are in English (Jev is English first); the page text stays in Korean. Each check uses `noul` or `choice`; `score` only for a rubric |
| Where it runs | (A) from the start: **PR CI replays fixtures; a real-key run is local or manual**. No nightly job with a key for now (that would put the key in GitHub, against ADR-0010). Reconsider after 3 months of fixtures if the fixtures go stale often |
| Fixtures | Each call is stored as `e2e/fixtures/jev/<sha256 of the request JSON>.json` (request and answer). With no key the helper replays the fixture with the same hash. **No fixture and no key: the check is skipped with an annotation `jev-fixture-missing`, not failed**, so a UI text change never turns CI red by itself; the annotation shows up in the report and the next local run with the key records the new fixture |
| Gate | The check passes when the answer equals the expectation. A wrong answer **fails** the test only when it is confident: `choice` and `score` with `confidence` at least 0.9, `noul` with the probability at least 0.9 or at most 0.1 on the wrong side. Below that it **warns** (`test.info().annotations`) and the test passes. The threshold is one constant in the helper |
| Cost and time limits | One run is capped at 50 calls and 400k input tokens (about $0.017 at the vendor price); the helper stops asking and skips the rest with an annotation when a cap is hit. Each call has a 10 s timeout. A call that errors, times out, or answers 429 or 5xx is skipped with an annotation, never a failure: Jev is early access |
| Key | `/sirloinbh/shared/jev-api-key` in SSM (ADR-0014 path rules), loaded to the PC's `project-standards/.env` by the central key command like the Claude key (ADR-0010 local flow). Read from `JEV_API_KEY` in the Node test process; never sent to the browser or logged. **Not** in GitHub secrets and not on the server |
| Route | **Default: the vendor's own API** (the key in SSM is a TypeSafe AI key): `https://api.typesafe.ai/v1/systemone` with model `jev-latest` (the vendor calls the API "System One"; `GET /v1/models` lists the models; auth is `Authorization: Bearer <key>`), so `JEV_API_KEY` alone turns on recording (#932). `JEV_API_URL` and `JEV_MODEL` select another route, such as OpenRouter (`typesafe/jev`). The helper builds the flat body (`model`, `state`, `questions`) and reads `answers`. It uses `fetch`, so no SDK and no new package |
| Gateway | Not through `shared-ai` or any gateway: these are test calls from a PC, and ADR-0019 adopts no gateway |
| Privacy | The text sent to Jev comes from test data on the e2e database, not from the owner's real records. Fixtures contain only that text |
| ADR-0010 | Unchanged: CI still holds no real key, and the fixture replay is the "fake" it asks for |

### Candidate checks by kind of app

| Kind | Example judged checks |
|---|---|
| Forms with server validation (all apps) | The error shown for an empty required field tells the user what to enter (`noul`) |
| Empty states (all apps) | The empty list says what to do next (`noul`) |
| Summaries and statistics (workout-memo, study-log, health-log, money-ledger) | The summary text matches the entered data: the data is passed in `state` with the text; counting stays in a normal assertion |
| AI features (study-log translation and extraction, later AI shell) | The translation keeps the meaning of the source (`choice`: same, partly, different) |

## Accuracy result (2026-11-21, #572)

The plan: 20 or more labeled Korean samples (the candidate checks above), the helper run with the real key, and the agreement rate at confidence 0.9 and above; accept the 0.9 gate when that agreement is at least 90%, otherwise raise the threshold or limit judged checks to English text.

The run: 27 samples, one Jev call each, through the helper itself (`judge()` in `templates/e2e/e2e/support/jev.ts`) on the vendor route (`jev-latest`, answered by `jev-1.14.0`). The samples follow the candidate checks: ARIA-snapshot-style regions written like the apps' screens (alerts, empty states with a heading and a button), a data line plus a summary sentence, and a Korean source with an English translation. Questions in English; labels set by hand before the run.

| Kind (question) | Samples | Agree | Confident (0.9 gate) | Confident and agree |
|---|---|---|---|---|
| Form error says what to enter (`noul`) | 6 (3 yes, 3 no) | 6 | 6 (yes 0.93 to 0.96, no 0.05 to 0.06) | 6 |
| Error tone (`choice`: actionable, vague, blaming) | 5 | 4 | 4 | 4 |
| Empty state says what to do next (`noul`) | 6 (3 yes, 3 no) | 6 | 5 (one yes at 0.86) | 5 |
| Summary describes the same thing as the data (`noul`) | 6 (3 yes, 3 no) | 6 | 6 (0.99 / 0.02) | 6 |
| Translation keeps the meaning (`choice`: same, partly, different) | 4 | 4 | 4 (0.92 to 1.0) | 4 |
| **Total** | **27** | **26 (96%)** | **25** | **25 (100%)** |

- The one disagreement: "문제가 생겼습니다. 나중에 다시 시도하세요." labeled `vague`, answered `actionable` with confidence 0.40. Under the gate it is a warning, not a failure, and the label is arguable ("try again later" is an action). The two answers below the gate (this one and an empty state at 0.86) are the borderline texts.
- **The 0.9 gate is accepted:** agreement at confidence 0.9 and above is 100% (25 of 25), above the 90% bar. No change to the threshold and no limit to English text.
- Cost: 28 calls (one route test plus the 27 samples), 9,430 input tokens, about $0.0004 at the vendor price. A `noul` call on a short alert is about 300 input tokens.
- Limits of this run: the samples are short hand-written texts, not snapshots captured from a running app, and the summary samples leave numbers out on purpose (counting stays in normal assertions). Revisit the gate if recorded fixtures show confident wrong answers.

## Consequences

- PR CI stays offline and deterministic; the only new CI cost is reading fixture files.
- A fixture is keyed by the whole request, so any change in the text under test needs a new local run with the key. That is the price of a replay that cannot hide a changed page; the `jev-fixture-missing` annotation makes the gap visible.
- A judged check is advisory by design: only a confident wrong answer fails a test.
- Implementation is #574 (helper in `templates/e2e`, central tests for the request shape, the gate, and the fixture replay, workout-memo pilot); the key is #573 (user step, done); the accuracy run is #572.

## Revisit when

- Jev leaves early access or changes its API (field names are route-specific today).
- Fixtures go stale often enough that a nightly real-key job is worth putting a key in GitHub.
- Jev gets image input out of beta (visual checks could then replace some screenshot baselines).
