# 560. Claude call tracking: no LLM gateway for now

## Change

- `docs/adr/0019-claude-call-tracking-without-gateway.md`: ADR (accepted 2026-11-18). No LLM gateway (LiteLLM) and no tracing service (Langfuse) for now. `shared-ai` records one `ai_usage` row per Claude request (tokens, model, latency, tool calls; no text) and stops at a monthly token limit; study-log logs `usage` per call; `shared-ai` gets its own key at `/sirloinbh/shared-ai/anthropic-api-key` so the Console splits usage by key. Lists the triggers for deciding again.

## Reason

- There are two Claude callers (study-log now, `shared-ai` planned) and one provider. LiteLLM needs a 4 GiB floor and self-hosted Langfuse recommends 16 GiB, on a 2 GB server. Langfuse Cloud would send personal data to a third party for features we do not need yet.

## Verification

- Facts checked on 2026-11-17: LiteLLM production guide and the 1.82.7 and 1.82.8 PyPI compromise (2026-03-24), Langfuse self-hosting requirements, pricing, and the ClickHouse acquisition (2026-01-16), and the Claude Usage and Cost Admin API docs. Callers counted from `registry/projects.json` (`features.claude`) and study-log `backend/src/translation.ts`, `extraction.ts`.
- `npm run check`: see the PR.

## Follow-up

- Accepted by the user on 2026-11-18. Next: add the `ai_usage` table, budget guard, and key path to #611 and #612, and open a study-log issue for the usage log line.
