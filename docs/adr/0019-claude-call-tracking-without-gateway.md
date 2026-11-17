# 0019. Track Claude calls inside shared-ai and the Console; no LLM gateway or tracing service for now

- Status: Proposed (issue #560; waiting for the user's decision)
- Date: 2026-11-17
- Builds on: [ADR-0010](0010-claude-api-key-ssm.md) and [ADR-0014](0014-app-secrets-ssm-paths.md) (one Claude key in SSM, path rules), [ADR-0017](0017-ai-service-mcp-and-shell.md) (`shared-ai` makes the AI shell's Claude calls and records tokens per conversation)

## Context

- ADR-0010 keeps one shared Claude key in one Console workspace (`byunghk-tool`, organization `Quantified ESG`, $200 monthly credit) and says to decide again when a second caller appears. ADR-0017 adds that second caller.
- Claude callers on 2026-11-17:

  | Caller | Calls | Status |
  |---|---|---|
  | study-log backend | `translation.ts` and `extraction.ts`, `claude-sonnet-5-5`, started by the user from the UI | Live (`features.claude: true`, the only app with it in `registry/projects.json`) |
  | `shared-ai` | The AI shell (`POST /api/chat`), a conversation with tool calls over every app | Planned (#611, #612) |
  | Other 7 apps | None | `features.claude: false`. Their AI features go through `shared-ai` tools (ADR-0017) |

- The server has 2 GB of memory shared by 8 apps, shared-auth, the proxy, and soon `shared-ai` ([costs.md](../costs.md)). Each new process must fit in what is left.
- The data the shell sends to Claude is personal: journal entries, health records, money, workouts.
- The issue asks to compare three options: no gateway (Console usage per workspace), LiteLLM, and Langfuse. Checking `shared-ai` itself as the place to record calls was added, because ADR-0017 already makes it record tokens.

### Facts checked on 2026-11-17

- **LiteLLM proxy** (Python): the production guide sets each instance at "1 vCPU and 4Gi of memory" as a floor, and per-key budgets, virtual keys, and spend logs need Postgres ([docs.litellm.ai/docs/proxy/prod](https://docs.litellm.ai/docs/proxy/prod)). The PyPI releases 1.82.7 and 1.82.8 were published with credential-stealing code on 2026-03-24 (TeamPCP; the PyPI token is reported to have leaked through a compromised Trivy step in its CI), and the malicious code was not in the GitHub source ([FutureSearch](https://futuresearch.ai/blog/litellm-pypi-supply-chain-attack/), [NetSPI](https://www.netspi.com/blog/executive-blog/ai-ml-pentesting/litellm-supply-chain-compromise/)).
- **Langfuse self-hosted**: needs Postgres, Redis or Valkey, ClickHouse, and S3-compatible storage plus a web and a worker container; the Docker Compose guide recommends at least 4 cores and 16 GiB of memory ([langfuse.com/self-hosting](https://langfuse.com/self-hosting), [docker-compose](https://langfuse.com/self-hosting/deployment/docker-compose)). ClickHouse bought Langfuse on 2026-01-16; the core stays MIT and Langfuse Cloud keeps running ([langfuse.com/blog/joining-clickhouse](https://langfuse.com/blog/joining-clickhouse)).
- **Langfuse Cloud Hobby**: free, 50k units per month, 30 days of history, 2 users, data in the US, EU, or Japan ([langfuse.com/pricing](https://langfuse.com/pricing)).
- **Claude Console**: the Usage and Cost pages and the Usage and Cost Admin API group tokens by API key, workspace, and model (1-minute to 1-day buckets, data within about 5 minutes) and cost by workspace. The Admin API needs an Admin API key, which only an organization admin can create, and it is not available to individual Console accounts ([platform.claude.com/docs/en/manage-claude/usage-cost-api](https://platform.claude.com/docs/en/manage-claude/usage-cost-api)). Every Messages API response already carries `usage` (input, output, cache read, cache write tokens), so a caller can count its own tokens without any extra service.

## Options considered

| | (A) Console only | (B) Record inside `shared-ai` (+ Console) | (C) LiteLLM proxy in front of every call | (D) Langfuse self-hosted | (E) Langfuse Cloud Hobby |
|---|---|---|---|---|---|
| What it gives | Usage and cost per key and workspace, a workspace spend limit | (A) plus tokens, model, latency, tool calls, and stop reason per conversation and per app, next to the chat history | Per-key budgets and rate limits, spend logs, routing across providers, a UI | Traces of every call and tool step, prompt versions, evaluations, cost dashboards | Same as (D), hosted |
| Memory on the server | 0 | 0 (a table in `shared-ai`'s existing Postgres) | 4 GiB floor per instance, plus Postgres: does not fit in 2 GB | 16 GiB recommended: does not fit | 0 (only the SDK in callers) |
| Money | 0 | 0 | 0 (open source) | 0 (open source) | 0 under 50k units per month |
| New secrets | 0 (an Admin key only if usage is read by API) | 0 | A LiteLLM master key and virtual keys; LiteLLM then holds the real Claude key | Langfuse keys, ClickHouse, S3, and Redis credentials | A Langfuse public and secret key per caller |
| Supply chain | None | None (code we write) | A large Python dependency tree; the 1.82.7 and 1.82.8 compromise shows each version needs review | A multi-container stack to keep updated | A tracing SDK in each caller |
| Where prompts and answers go | Anthropic only | Anthropic only; our own DB | Anthropic, plus LiteLLM's spend logs on our server | Our server | A third party (Langfuse Cloud) as well, unless inputs and outputs are masked |
| Fit for one provider and two callers | Enough for totals | Enough, and per conversation | Its main value (many providers, many teams) does not apply here | Built for teams with many prompts to evaluate | Same as (D) |

(C) and (D) do not fit on the server. (E) works on paper, but it sends personal data to another company for features (prompt versions, evaluations) that two callers do not need yet. (A) alone cannot answer "which conversation or tool loop spent the tokens", and ADR-0017 already asks `shared-ai` to keep that record.

## Decision (proposed)

(B): no LLM gateway and no tracing service now. Each caller records its own calls, and the Console stays the source of truth for cost and the spending limit.

| Item | Decision |
|---|---|
| `shared-ai` record | One row per Claude request in its Postgres (`ai_usage`): conversation ID, app and page the shell was opened from, model, input, output, cache read and cache write tokens from `usage`, latency, stop reason, number of tool calls, and an error code if it failed. No prompt or answer text in this table; the chat history table already holds the text under the owner's control |
| `shared-ai` budget guard | Before each request, sum this month's tokens from `ai_usage`. Over a limit set in an environment variable (`AI_MONTHLY_TOKEN_LIMIT`), the shell answers with a clear "monthly limit reached" error instead of calling Claude. It is a cheap stop for a runaway tool loop, below the Console limit |
| study-log | Logs `usage` and `model` on each call in its server log (one structured line). No table and no new dependency |
| Keys | Split by caller when `shared-ai` is first deployed: `shared-ai` gets its own key at `/sirloinbh/shared-ai/anthropic-api-key` (ADR-0014 path rules; `shared-ai` is a registry entry), and study-log keeps `/sirloinbh/shared/anthropic-api-key`. Then the Console's Usage page splits tokens by key without an Admin key. This answers the "decide again" point in ADR-0010 |
| Spending limit | Keep the workspace limit on `byunghk-tool`. Putting the `shared-ai` key in its own workspace with its own limit is optional and a user step |
| Not adopted | LiteLLM, Langfuse (self-hosted or Cloud), other hosted LLM proxies, OpenTelemetry collectors |

### When to decide again

Reopen this decision if any of these happens:

- A third direct Claude caller appears outside `shared-ai`, or a second model provider is added (a gateway starts to pay off).
- Prompts need versioning or evaluation across releases (Langfuse's strength); look at Langfuse Cloud with input and output masking first, because self-hosting still would not fit.
- The server grows to 8 GB or more, or a separate server is added.
- If LiteLLM is ever adopted, pin an exact reviewed version at least 14 days old ([dependency-policy.md](../dependency-policy.md)) and never 1.82.7 or 1.82.8.

## Consequences

- No new process, image, or secret type. The server memory budget is unchanged by this decision.
- Per-conversation cost is visible in `shared-ai`'s own data; totals and the real bill stay in the Console. Our table can miss a request that crashes mid-stream, so treat `ai_usage` as an estimate and the Console as the bill.
- No cross-provider routing, retries, or fallbacks from a gateway. The Anthropic SDK's own retries and server-side fallbacks (as study-log uses) cover the single provider.
- Splitting the key adds one SSM parameter and one Console key to create (a user step, like #266). Rotation is per key.
- Follow-up when accepted: add the `ai_usage` table, budget guard, and key path to #611 (`shared-ai` service) and #612 (AI shell); open a small study-log issue for the usage log line.
