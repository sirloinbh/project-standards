# Environment variables at a glance

<!-- Generated file (scripts/compliance.mjs). The source is each repo's .env.example. Secret values are not shown. Generated: 2026-11-27 23:17 UTC -->

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
| `SOLVEDAC_HANDLE` | solved.ac handle to import solved Baekjoon problems from |  |  |  | backend |  | central |
| `LEETCODE_USERNAME` | LeetCode username to import recent accepted submissions from |  |  |  | backend |  | central |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for the calendar sync |  |  |  | backend |  | central |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret for the calendar sync |  | yes | (secret) | backend |  | central |
| `GOOGLE_REDIRECT_URI` | Address of the calendar sync callback (https://<site>/api/calendar-sync/callback) |  |  |  | backend |  | central |
| `CALENDAR_TOKEN_KEY` | Key (32 random bytes, base64) that encrypts the saved Google refresh token |  | yes | (secret) | backend |  | central |
| `FILE_BUCKET` | (no description) |  |  |  |  |  | central |
| `AWS_REGION` | (no description) |  |  |  |  |  | central |
| `AWS_ACCESS_KEY_ID` | (no description) |  | yes | (secret) |  |  | central |
| `AWS_SECRET_ACCESS_KEY` | (no description) |  | yes | (secret) |  |  | central |
| `REMINDER_EMAIL_TO` | Address that receives the daily review reminder |  |  |  | backend |  | central |
| `REMINDER_EMAIL_FROM` | SES-verified sender address of the review reminder |  |  |  | backend |  | central |
| `SES_REGION` | AWS region of SES for the review reminder (falls back to AWS_REGION) |  |  |  | backend |  | central |
| `SES_AWS_ACCESS_KEY_ID` | Access key ID of the SES-only user for the review reminder |  | yes | (secret) | backend |  | central |
| `SES_AWS_SECRET_ACCESS_KEY` | Secret access key of the SES-only user for the review reminder |  | yes | (secret) | backend |  | central |
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
| `WORKOUT_MEMO_URL` | (no description) |  |  |  |  |  | central |

## sirloinbh/life-journal

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `journal` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `journal` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3104` |  |  | central |
| `AUTH_DISABLED` | (no description) |  |  | `1` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |
| `NOTION_TOKEN` | (no description) |  | yes | (secret) |  | `/sirloinbh/life-journal/notion-token` | central |

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
| `KIS_APP_KEY` | KIS Open API app key (live Korean prices) |  | yes | (secret) | backend |  | central |
| `KIS_APP_SECRET` | KIS Open API app secret |  | yes | (secret) | backend |  | central |
| `KAKAO_REST_API_KEY` | Kakao REST API key (Kakao Login client_id) |  | yes | (secret) | backend |  | central |
| `KAKAO_CLIENT_SECRET` | Kakao client secret (Kakao Login security setting) |  | yes | (secret) | backend |  | central |
| `KAKAO_REDIRECT_URI` | (no description) |  |  |  |  |  | central |
| `KAKAO_TOKEN_KEY` | 32-byte key (64 hex characters) that encrypts the stored Kakao tokens |  | yes | (secret) | backend |  | central |
| `KAKAO_APP_URL` | (no description) |  |  |  |  |  | central |
| `KAKAO_SKILL_SECRET` | Shared secret the chatbot webhook requires in the x-kakao-skill-secret header (16+ characters) |  | yes | (secret) | backend |  | central |
| `KAKAO_ALLOWED_USER_IDS` | (no description) |  |  |  |  |  | central |
| `PHOTO_BUCKET` | (no description) |  |  |  |  |  | central |
| `AWS_REGION` | (no description) |  |  | `ap-northeast-2` |  |  | central |
| `AWS_ACCESS_KEY_ID` | Access key id of the app's photo bucket user (Get/Put/DeleteObject on that bucket only) |  | yes | (secret) | backend |  | central |
| `AWS_SECRET_ACCESS_KEY` | Secret access key of the same user |  | yes | (secret) | backend |  | central |
| `NAVER_CLIENT_ID` | Naver Open API client ID (news search) |  | yes | (secret) | backend | `/sirloinbh/money-ledger/naver-client-id` | central |
| `NAVER_CLIENT_SECRET` | Naver Open API client secret (news search) |  | yes | (secret) | backend | `/sirloinbh/money-ledger/naver-client-secret` | central |
| `NEWS_SOURCE` | (no description) |  |  |  |  |  | central |
| `ANTHROPIC_API_KEY` | Anthropic API key for the daily Claude pick |  | yes | (secret) | backend | `/sirloinbh/money-ledger/anthropic-api-key` | central |
| `PICK_MODEL` | (no description) |  |  |  |  |  | central |
| `PICK_SOURCE` | (no description) |  |  |  |  |  | central |
| `KIS_APP_KEY` | KIS Open API app key (live Korean prices) |  | yes | (secret) | backend |  | central |
| `KIS_APP_SECRET` | KIS Open API app secret |  | yes | (secret) | backend |  | central |
| `ECOS_API_KEY` | ECOS Open API auth key (Bank of Korea base rate, for the deposit comparison) |  | yes | (secret) | backend |  | central |

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
| `VAPID_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/plan-routine/vapid-public-key` | central |
| `VAPID_PRIVATE_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/plan-routine/vapid-private-key` | central |
| `VAPID_SUBJECT` | (no description) |  | yes | (secret) |  | `/sirloinbh/plan-routine/vapid-subject` | central |

## sirloinbh/dev-career-portfolio

| Key | Description | Required | Secret | Default | Used by | SSM parameter | Section |
|---|---|---|---|---|---|---|---|
| `POSTGRES_DB` | (no description) |  |  | `career` |  |  | central |
| `POSTGRES_USER` | (no description) |  |  | `career` |  |  | central |
| `POSTGRES_PASSWORD` | (no description) |  | yes | (secret) |  |  | central |
| `DATABASE_URL` | (no description) |  | yes | (secret) |  |  | central |
| `PORT` | (no description) |  |  | `3108` |  |  | central |
| `AI_TOOLS_PUBLIC_KEY` | (no description) |  | yes | (secret) |  | `/sirloinbh/shared/ai-tools-public-key` | central |
