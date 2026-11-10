# User-step key and OAuth issuance, and SSM storage (#422)

- Survey date: 2026-11-08. Issuance conditions and limits can change, so check the official guidance again right before issuing.
- User decision (2026-11-08): environment variables and API keys are managed in AWS SSM Parameter Store.
- Evidence level: **official** is a value read directly from the provider's page, **secondary** is a value seen only in blogs or search results, and **unconfirmed** is a value I could not find.

## Summary

| Issue | What to issue | Approval | Expiry | SSM path (proposed) | App environment variable |
|---|---|---|---|---|---|
| project-standards#266 | Anthropic API key | Immediate | Chosen at creation (Never is possible) | `/sirloinbh/shared/anthropic-api-key` | `ANTHROPIC_API_KEY` |
| project-standards#286 | healthchecks.io project ping key | Immediate | None | `/sirloinbh/shared/healthchecks-ping-key` | Read by the server install script |
| study-log#129, life-journal#40 (TourAPI), health-log#118 | **One** Public Data Portal (data.go.kr) auth key | Development account is automatic, 1 hour to half a day until first use | 2 years (secondary) | `/sirloinbh/shared/data-go-kr-service-key` | `HOLIDAY_API_KEY`, `TOURAPI_SERVICE_KEY`, etc. |
| life-journal#38 | Google OAuth client ID and secret | Immediate, publish without review | None | `/sirloinbh/life-journal/google-oauth-client-id`, `-secret` | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` |
| life-journal#40 | YES24 key, TMDB read token | Immediate | None (including unconfirmed) | `/sirloinbh/life-journal/yes24-api-key`, `tmdb-read-access-token` | `YES24_API_KEY`, `TMDB_READ_ACCESS_TOKEN` |
| life-journal#44 | KOPIS key | Issued by email (secondary) | 1 year (secondary) | `/sirloinbh/life-journal/kopis-service-key` | `KOPIS_SERVICE_KEY` |
| money-ledger#85 | KRX key, Tiingo token, Korea Eximbank key | KRX needs administrator approval per key and per API (about 1 day), the rest are immediate | KRX 1 year (request an extension), Korea Eximbank 2 years (re-consent) | `/sirloinbh/money-ledger/krx-api-key`, `tiingo-api-key`, `koreaexim-api-key` | `KRX_API_KEY`, `TIINGO_API_KEY`, `KOREAEXIM_API_KEY` |
| health-log#28 | Garmin Personal API key | Immediate (no approval) | Choose from 30 days to 1 year | `/sirloinbh/health-log/garmin-personal-api-key` | `GARMIN_PERSONAL_API_KEY` |

Environment variable names follow the ones already set in each app's docs. life-journal#38 and health-log#28 have no names yet, so this document proposes them.

## What the survey newly found

- **The Public Data Portal key is one per account.** If you apply for use of the special-day information, TourAPI, and food nutrition APIs separately, they are all called with the same key (secondary). So SSM keeps one shared path, and each app passes it under a different environment variable.
- **Garmin opened an official personal API (Personal).** You get the key in Garmin Connect settings with no application or approval. The unofficial library (garth) is no longer maintained. For health-log#28, this approach is the first choice.
- **If Google OAuth is left in the "Testing" state, the refresh token expires after 7 days.** An app used only by yourself can be published as "Production" without review (a warning screen still appears). Unless the redirect address is localhost, it must be https on a public domain, so to use it on the server the subdomain (#406) must exist first.
- **The Aladin Open API ended on 2026-10-30.** YES24 issues keys to individuals right away.
- **The KRX terms allow non-commercial use only and do not allow giving the received information to third parties.** It is fine while you use money-ledger alone, but showing the prices to other people could violate the terms. The label "한국거래소 통계정보" (Korea Exchange statistics) must be shown on screen.
- **Expiry cycles differ per service.** Register the address that receives expiry notification emails accurately, and follow the "Renewal schedule" below.

## Issuing steps per service

### Anthropic API key (#266)
1. In the Console (`platform.claude.com`), create the shared workspace for the apps (`byunghk-tool`, ADR-0010). You cannot set a spending limit on the Default Workspace (official).
2. Under Workspaces → that workspace → Spend limits, set the monthly limit and alerts. When the limit is reached, the API returns 400 (official).
3. API keys → Create key. Restrict it to that workspace, and choose Never or 1 year for expiry. You cannot change the expiry after creation (official).
4. Put the value into SSM straight from the screen (see "Commands to put values in SSM" below).

### healthchecks.io (#286)
- The free Hobbyist plan allows up to 20 checks (official). 8 apps × (health, backup, restore check) plus the daily report can exceed 20, so recount the number of checks in #284.
- There are two signal address formats (official). The UUID format (`hc-ping.com/<uuid>`) gives one secret address per check. In the **ping key + slug format** (`hc-ping.com/<ping-key>/<slug>`), only the project's one ping key is secret and the slug can be public. Only one value has to be kept in SSM, so use the slug format.
- Create the ping key in the project Settings. Do not use the API key.

### Public Data Portal (data.go.kr) auth key (study-log#129, life-journal#40 TourAPI, health-log#118)
1. Sign up at data.go.kr → on each API detail page, click "Apply for use" (활용신청). Development accounts are approved automatically (official). Apply for all three at once.
   - Special day information (15012690): development 10,000 calls per day
   - Korean tourism information TourAPI (15101578): development **1,000 calls per day**. Operation accounts need review
   - Food nutrition DB (15127578): development 10,000 calls per day
2. From My Page, put the "General auth key (Decoding)" (일반 인증키(Decoding)) into SSM. The HTTP library in the code encodes the query, so using the Encoding key causes double encoding and a key error (official guidance, secondary reports).
3. For 1 hour to half a day right after approval, `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` (30) may occur (secondary). Wait and check again.
4. Send the key only as a query string (`serviceKey`, `ServiceKey` for special day information) (official). Remove it when leaving URLs in logs.
- health-log#118 is still "review later". The key is the same, so you only need to apply for use of that API.

### Google Calendar OAuth client (life-journal#38)
1. Create a project in Google Cloud and enable the Calendar API.
2. OAuth consent screen: user type "External" (외부), scopes are the minimum the implementation needs (`calendar.events` and so on). `calendar.events` is a sensitive scope (secondary).
3. **Change the publishing status to "Production" (프로덕션).** Do not apply for review. For personal use under 100 users, review is not required (official). At sign-in you have to get past the "unverified app" (확인되지 않은 앱) warning. If left in "Testing" (테스트), the refresh token expires every 7 days (official).
4. Create the OAuth client (web application). Redirect URI rules (official):
   - Local development: `http://localhost:<registry api port>/...` is allowed
   - Server: only https on a public domain is allowed. IP addresses and private domains are not. It can only be registered after #406 (subdomain and HTTPS) is done
5. Put the client ID and secret into SSM. The refresh token received after the user connects is stored by the app in the DB (not put in SSM).
- Alternative: sharing a personal calendar with a service account to use it without OAuth has conflicting reports of working and not working (secondary). Not used.

### YES24, TMDB (life-journal#40)
- **YES24:** Log in at `developers.yes24.com`, enter the purpose of use, and agree to the terms for immediate issuance. `X-Api-Key` header, the basic key allows 20,000 calls per day and 10 per second, one key per person. The screen must show the source and a link to the product detail page, and you must not bulk-collect into a separate DB (official).
- **TMDB:** Apply under account settings → API. Use the v4 read access token as `Authorization: Bearer`. Free for non-commercial use, the logo and notice text must be shown, and the cache must be 6 months or less (official). Expiry is unconfirmed.

### KOPIS (life-journal#44)
- Apply only from a PC at kopis.or.kr, one key per person (official). The key is sent as the query `service`, and the specification is published only over http (official, development guide v5.0). Source attribution is required.
- The call limit figures, expiry, and commercial conditions are unconfirmed. Check the terms when applying and write them in the issue.

### KRX, Tiingo, Korea Eximbank (money-ledger#85)
- **KRX:** Sign up at Data Marketplace → apply for an auth key (administrator approval) → apply for use of the daily trading information for the KOSPI, KOSDAQ, and ETF **each separately** (administrator approval, about 1 day, secondary). With a key but no API approval you get 401 (secondary). 10,000 calls per day per key, the usage period is 1 year and you request an extension before expiry, and it can be deleted if unused for 12 months (official terms). Sent in the `AUTH_KEY` header (secondary).
- **Tiingo:** After signing up, check the free Starter token. 50 calls per hour, 1,000 per day, 500 symbols per month, for your own personal use only (official). `Authorization: Token <token>` header.
- **Korea Eximbank:** Issued at `oapi.koreaexim.go.kr` after consent to personal information and identity verification. 1,000 calls per day, and beyond that you get `result:4` (official). Before the 2-year personal information retention period ends you must re-consent by email, and if you miss it the key is destroyed and you get `result:3` (the same value as an authentication error) (official). Errors also come as HTTP 200, so always check `result`.

### Garmin Personal API (health-log#28)
- Create the key in the Garmin Connect web → Settings → Personal API Token. No application or approval, your own data only, pull method only (official).
- Choose the expiry from 30, 90, 180 days, or 1 year. Choose 1 year and add it to the renewal schedule. The key is shown only once, so put it into SSM right away.
- The app uses the key to get a 24-hour access token (no refresh token). It does not store the token and gets a new one when needed.
- The call limits and terms details are unconfirmed. If they differ from the decision in the #26 survey, decide again when starting #28.

## Renewal schedule

| Key | Cycle | What to do |
|---|---|---|
| KRX | 1 year | Request an extension before expiry |
| Korea Eximbank | 2 years | Re-consent by email |
| Public Data Portal | 2 years (secondary) | Extend the usage period on the portal |
| KOPIS | 1 year (secondary) | Unconfirmed. Check at issuance |
| Garmin | Chosen period (up to 1 year) | Create a new key and replace the SSM value |
| Anthropic | Chosen period | Unless Never, create a new key and replace it |

Replacing means changing only the SSM value. The server uses the new value from the next deploy, and a PC uses it when you run `pull` again.

## Commands to put values in SSM

So that values do not stay in shell history or chat, take them from standard input, like the current `tools/app-secrets.mjs set`. The generalized command (`set <path>`) is built in the implementation issue. Until then, put them in directly with the AWS CLI.

```powershell
# Ask for the value and receive it without showing it on screen
$v = Read-Host -AsSecureString 'Value'
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($v))
aws ssm put-parameter --profile <personal profile> --region ap-northeast-2 --type SecureString --overwrite --name /sirloinbh/<app>/<name> --value $plain
Remove-Variable v, plain
# Check: only the name and modified time, without the value
aws ssm describe-parameters --profile <personal profile> --region ap-northeast-2 --parameter-filters Key=Name,Option=BeginsWith,Values=/sirloinbh/
```

A value passed with `--value` does not stay in that PowerShell window's command history (the variable received with `Read-Host`), but other processes on the same PC can see command line arguments. In the implementation issue, build a command that passes it through standard input.

## Follow-up implementation (proposed)

1. A new ADR that extends ADR-0010: path rules, the `@ssm=` tag, permissions
2. shared-aws-infrastructure: widen the server read permission to `/sirloinbh/shared/*` and `/sirloinbh/<app>/*`, and add write permission to the user policy
3. Deploy templates: read the `@ssm=` tag and pass it on (`remote-deploy.sh`, `ssm-get.sh`), and have the server install script read the healthchecks ping key
4. `tools/app-secrets.mjs`: `set <path>`, `check`, `pull <app>`
5. `standards-check`, `docs/env-matrix.md`: check and display `@ssm=`

## Sources

- Google OAuth: https://developers.google.com/identity/protocols/oauth2 , https://support.google.com/cloud/answer/13464323 , https://developers.google.com/identity/protocols/oauth2/web-server
- TMDB: https://developer.themoviedb.org/docs/faq , https://www.themoviedb.org/api-terms-of-use
- YES24: https://developers.yes24.com/docs/apikey , https://developers.yes24.com/support/terms ; Aladin shutdown: https://blog.aladin.co.kr/openapi
- Tiingo: https://www.tiingo.com/about/pricing , https://www.tiingo.com/documentation/general/connecting
- healthchecks.io: https://healthchecks.io/pricing/ , https://healthchecks.io/docs/slug_urls/
- Garmin: https://developer.garmin.com/gc-developer-program/overview/ , https://developer.garmin.com/gc-developer-program/personal/personal-faq/ , https://github.com/matin/garth
- Anthropic: https://platform.claude.com/docs/en/manage-claude/authentication , https://platform.claude.com/docs/en/manage-claude/workspaces
- Public Data Portal: https://www.data.go.kr/data/15012690/openapi.do , https://www.data.go.kr/data/15101578/openapi.do , https://www.data.go.kr/data/15127578/openapi.do
- KOPIS: https://www.kopis.or.kr/por/cs/openapi/openApiInfo.do?menuId=MNU_00074
- KRX: https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp , terms https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO002.jsp
- Korea Eximbank: https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C

## How to store in SSM (proposed)

Right now only one Claude API key is in SSM ([ADR-0010](../adr/0010-claude-api-key-ssm.md)). The server IAM user `sirloinbh-apps-secrets-reader` can read only that one parameter, and the deploy script reads it by writing that name directly. Keys will grow to 5 apps and then 10 or more, so widen it as below. This document is a proposal; if adopted, it proceeds as a new ADR that amends ADR-0010 plus implementation issues.

### Names

| Kind | Path | Example |
|---|---|---|
| A key that several apps use with the same value | `/sirloinbh/shared/<name>` | `/sirloinbh/shared/anthropic-api-key`, `/sirloinbh/shared/data-go-kr-service-key` |
| A key that only one app uses | `/sirloinbh/<app>/<name>` | `/sirloinbh/money-ledger/tiingo-api-key` |

- Write `<name>` in lowercase and hyphens. Keep it separate from the environment variable name the app reads, so that one Public Data Portal key can be passed under a different variable per app (`HOLIDAY_API_KEY`, `TOURAPI_SERVICE_KEY`).
- All are `SecureString`, the AWS managed KMS key (`alias/aws/ssm`), standard parameters (free), region `ap-northeast-2`.
- The existing `/sirloinbh/anthropic-api-key` has no value put in it yet in #266, so if you move it to `/sirloinbh/shared/anthropic-api-key` before putting it in, there is nothing to move.

### Which parameter goes into which variable

The app's `.env.example` is the source of environment variables ([env-conventions.md](../env-conventions.md)), so add one more tag there.

```dotenv
# @desc Public Data Portal auth key (Decoding) for holiday lookup @secret @used=backend @ssm=/sirloinbh/shared/data-go-kr-service-key
HOLIDAY_API_KEY=
```

- The deploy script reads SSM for every key that has an `@ssm=` tag and passes it on as compose environment variables. No value is written to the server `.env`. This widens the way the Claude key is read now (`deploy/ssm-get.sh`) to a list of tags.
- For local development, `node tools/app-secrets.mjs pull <app>` reads the same tags and puts them in that app's `.env`. Right now it puts one Claude key into `project-standards/.env`.
- `standards-check` checks the shape of the `@ssm=` path, and `docs/env-matrix.md` shows the path alongside. Values are not shown.

### Permissions

| Principal | Permissions | Scope |
|---|---|---|
| User PC (personal AWS profile) | `ssm:PutParameter`, `GetParameter`, `GetParametersByPath`, `DeleteParameter` | `parameter/sirloinbh/*` |
| Server `sirloinbh-apps-secrets-reader` | `ssm:GetParameter`, `GetParametersByPath` | `parameter/sirloinbh/shared/*`, `parameter/sirloinbh/<app>/*` (apps on the server) |
| CI | None | Tests replace external APIs with fakes |
| Agents | None | They do not view or move values. They only check existence (`check`) |

- All apps are on one server, so IAM users are not split per app. If the server key leaks, all app keys are replaced together (the same judgment as ADR-0010).
- The current user IAM (the `terraform-workout` policy) has no SSM write permission, so it was denied in #266. Permissions must be added with the scope above.

### What is not put in SSM

- **Values the app receives while running, like an OAuth refresh token:** The app receives and stores it when the user first connects, and receives it again when it expires. For the server to write to SSM it would need write permission, so keep it in the app DB. SSM holds only the OAuth client ID and secret.
- **Values decided on the server, like a DB password:** Keep them in the server `.env` as now. Outside the scope of this issue.
- **The healthchecks.io signal address:** The server timer uses this value, so the server install script reads it, not the app compose. If kept in SSM, the install script would also have to read SSM (see the table below).
