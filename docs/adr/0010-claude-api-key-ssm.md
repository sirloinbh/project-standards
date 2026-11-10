# 0010. Keep the Claude API key in one place in AWS SSM Parameter Store and have apps fetch it

- Status: Accepted (issue #264)
- Date: 2026-10-27

## Context

- The user wanted to set up the Claude API key once in project-standards and use it from several apps (2026-10-27).
- The only app that uses the Claude API now is study-log (`backend/src/translation.ts`, `ANTHROPIC_API_KEY` in the server `.env`).
- All repos are public, so the key **value** cannot be kept in the central repo. The central repo provides commands and rules, and the value is kept in one place outside the repo.
- An IAM role cannot be attached to the Lightsail server, so the server needs one key to read AWS.
- A personal account has no organization-level Actions secrets.
- The options compared (SSM, a server shared file + PC user folder) and the key split are in the #264 comments. The user chose the recommended option as is.

## Decision

| Item | Decision |
|---|---|
| Source of truth | AWS SSM Parameter Store SecureString `/sirloinbh/anthropic-api-key` (ap-northeast-2, AWS managed KMS key). It is a standard parameter, so there is no cost |
| Number of keys | 1. A spending limit is set on one workspace. When a second app starts using it, decide again whether to split into per-app keys (`/sirloinbh/<app>/anthropic-api-key`) |
| Production server | The deploy script reads it from SSM at deploy time and passes it to the app container as an environment variable. The value is not written to the server `.env`. The server keeps an IAM key that can read only that one parameter in one server shared file, `/opt/project-standards/.env` (the app `.env` is a fallback) |
| Local development | A central command reads SSM with the personal AWS profile and puts it in one place, `project-standards/.env` (git-ignored). Apps that use the key read that file during local development |
| Names | The server IAM user uses a name shared by all apps (`sirloinbh-apps-secrets-reader`), not tied to a specific app. The Console workspace is also shared by all apps (`byunghk-tool`) |
| CI | No real key is kept. Tests replace the API call with a fake |
| Rotation | Only the SSM value is changed. The server uses the new key from the next deploy, and the PC uses it after rerunning the central command |
| Environment variable names | `ANTHROPIC_API_KEY` (secret), `CLAUDE_MODEL` (model name; not hard-coded in code) |
| Shared call code | Not built. If more apps use it, decide again in #241 (API shape survey) |

## Consequences

- When rotating the key, SSM is the only place to fix. The rotation record stays in AWS (CloudTrail).
- The server gains one more AWS read key. That key can read only this one parameter, so even if it leaks, it cannot reach other AWS resources. However, it can read the Claude API key, so if the server key leaks, rotate both keys together.
- The server calls SSM with `curl --aws-sigv4` without the AWS CLI (the same way as the #262 S3 upload).
- The parameter and IAM user are created by shared-aws-infrastructure with Terraform. The parameter **value** is entered by the user directly so that it does not remain in the Terraform state.
- Implementation is #265 (delivery tool), and the user steps are #266 (issuing the key, spending limit, putting it in SSM).
- Change on 2026-10-29 (#266): The user decided not to tie names and locations to a specific app. The server IAM user name was changed from `workout-memo-*` to `sirloinbh-apps-*`. The server's AWS keys (SSM read, S3 backup) are kept in one place, `/opt/project-standards/.env`, not in the app `.env`. The PC's Claude key is kept in one place, `project-standards/.env`, instead of the app `.env`. The key uses the monthly API credit included in the Claude Max subscription, and no payment method is set in the Console.
- Change on 2026-11-01 (#266): The credit is $200 per month and is linked to the Console organization `Quantified ESG`. The user decided to use that organization instead of moving to a personal one. The app-shared workspace `byunghk-tool` and the key are created in that organization. That organization's administrators can see usage and cost per workspace and key and can manage the workspace. If an administrator changes the key or limit, or the user loses organization permission, the apps' Claude calls may stop. In that case, create a key in another organization and change only the SSM value.
