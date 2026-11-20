# #572 Decide how e2e tests use Jev as a judge

ADR-0028 (Proposed) records the design. The Korean accuracy run and the key stay with #573, so its "Accuracy result" section is empty.

## Change

| File | Content |
|---|---|
| `docs/adr/0028-e2e-jev-judge.md` | What Jev judges, the input (ARIA snapshot, 24k character cap), question wording, PR CI replays fixtures and the real-key run is local, fixtures keyed by request hash with skip on a miss, the confident-wrong gate (0.9), cost and time caps, the key path `/sirloinbh/shared/jev-api-key`, no gateway, candidate checks, the accuracy test plan |

## What was decided

- **No real key in CI.** ADR-0010 stays as it is; recorded fixtures are the "fake". A nightly job with a key is a "revisit when" item.
- **A missing fixture skips, it does not fail**, with an annotation, so a UI text change never reddens CI alone.
- **Only a confident wrong answer fails** (confidence 0.9 or more; for `noul` the probability). Everything else warns.
- **The route is a setting (`JEV_API_URL`).** The three routes found (vendor API, OpenRouter, AIML API) use the same flat body, so the default waits for what the key from #573 offers.

## Checks

- Facts about the API come from the Cloudflare, OpenRouter, and AIML API pages (2026-11-20); the vendor's own API reference was not read and is to be confirmed with #573.
- `npm run check`: see the PR.
