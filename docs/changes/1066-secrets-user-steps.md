# #1066 Survey the user steps for keys and accounts on the held cards

- Issue: [#1066](https://github.com/sirloinbh/project-standards/issues/1066)
- Branch: `docs/1066-secrets-user-steps`
- Parent: #1054

## Changes — 2026-11-23

`docs/research/app-secrets-ssm.md` has a new section, "Update 2026-11-23": what changed since the 2026-11-08 survey (Korea Eximbank host, TMDB limit, KOPIS details, Google OAuth and Play Console rules, Anthropic image billing), one row per held card (money-ledger#56, health-log#47 and #118, workout-memo#111 and #120, develop-skill#34) saying whether a key or account is needed, what the user does, what the agent does, the SSM parameter and variable, cost, approval and expiry, and three sittings that group the user steps. Each of those cards gets a comment with its row.

Findings: only health-log#47 (shared Anthropic key) and health-log#118 (shared data.go.kr key) use SSM; money-ledger#56 and develop-skill#34 need no key; workout-memo#111 needs a Play account and #120 only a Nike data request (Strava is a fallback that needs a subscription).

Unconfirmed, written as such in the document: data.go.kr key validity period, KOPIS limits, KRX header name, Korea Eximbank key steps, whether a health or workout app needs a Play organization account, Nike export contents, NRC to Strava sync in this country.

## Verification

- Official pages re-read on 2026-11-23 by three research passes; unreadable pages are marked secondary or unconfirmed.
- `npm run check`: see the PR. No secret value in any file.
