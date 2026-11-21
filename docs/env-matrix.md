# Environment variables at a glance

<!-- Generated file (scripts/compliance.mjs). The source is each repo's .env.example. Secret values are not shown. Generated: 2026-11-20 22:10 UTC -->

Rules: [env-conventions.md](env-conventions.md)

## sirloinbh/workout-memo

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `workout` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `workout` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3101` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/study-log

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `study` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `study` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3102` |  |  | central |
| `ANTHROPIC_API_KEY` | (no description) |  | yes | (secret) |  |  | central |
| `HOLIDAY_API_KEY` | Public Data Portal auth key (Decoding) for holiday lookup |  | yes | (secret) | backend | `/sirloinbh/shared/data-go-kr-service-key` | central |
| `FILE_BUCKET` | (no description) |  |  |  |  |  | central |
| `AWS_REGION` | (no description) |  |  |  |  |  | central |
| `AWS_ACCESS_KEY_ID` | (no description) |  | yes | (secret) |  |  | central |
| `AWS_SECRET_ACCESS_KEY` | (no description) |  | yes | (secret) |  |  | central |
| `WEB_BIND` | (no description) |  |  | `127.0.0.1` |  |  | central |
| `WEB_PORT` | (no description) |  |  | `8102` |  |  | central |
| `AUTH_INTERNAL_URL` | (no description) |  |  |  |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/health-log

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `health` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `health` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3103` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/life-journal

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `journal` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `journal` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3104` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/money-ledger

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `money` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `money` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3105` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | shared-ai's Ed25519 public key (PEM, one line with \\n escapes). Set: the API serves its AI tools at /internal/tools; empty: no tools |  | yes | (secret) | backend, compose | `/sirloinbh/shared/ai-tools-public-key` | central |
| `KRX_API_KEY` | KRX Open API auth key (domestic daily prices, AUTH_KEY header) |  | yes | (secret) | backend | `/sirloinbh/money-ledger/krx-api-key` | central |
| `TIINGO_API_KEY` | Tiingo API token (US prices) |  | yes | (secret) | backend | `/sirloinbh/money-ledger/tiingo-api-key` | central |
| `KOREAEXIM_API_KEY` | Korea Eximbank exchange rate API auth key (KRW/USD) |  | yes | (secret) | backend | `/sirloinbh/money-ledger/koreaexim-api-key` | central |
| `PRICE_SOURCE` | (no description) |  |  |  |  |  | central |
| `PRICE_JOBS` | (no description) |  |  |  |  |  | central |
| `JOBS_MODE` | (no description) |  |  |  |  |  | central |

## sirloinbh/cert-manager

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `cert` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `cert` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3106` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | shared-ai's Ed25519 public key (PEM, one line with \\n escapes). Set: the API serves its AI tools at /internal/tools; empty: no tools |  | yes | (secret) | backend, compose | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/plan-routine

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `plan` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `plan` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3107` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |

## sirloinbh/dev-career-portfolio

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `career` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `career` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3108` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |
