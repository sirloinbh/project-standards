# #264 Decision on how to manage the Claude API key

## Decision

The user chose **AWS SSM Parameter Store** (SecureString) as the source of truth and **1 key for now** (2026-10-27). The comparison is in a #264 comment and the decision is [ADR-0010](../adr/0010-claude-api-key-ssm.md).

## Change

| File | Content |
|---|---|
| `docs/adr/0010-claude-api-key-ssm.md` | Source location, delivery paths to server, local, and CI, the number of keys, rotation, and environment variable names |
| `docs/env-conventions.md` | Shared keys `ANTHROPIC_API_KEY` and `CLAUDE_MODEL` |

The implementation is #265 and the user steps are #266.

## Verification

- `npm run check`: see the PR body
