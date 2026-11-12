# #422 Research on OAuth and API key issuance steps for users, and how to store them in SSM

The user asked for this on 2026-11-08. It was decided to manage environment variables and API keys with SSM.

## Change

| File | Content |
|---|---|
| `docs/research/app-secrets-ssm.md` | Issuance steps for the 8 target issues, expiry and renewal schedule, proposed SSM paths and permissions, list of follow-up implementation |

## Decisions (proposals, to be confirmed in the implementation issues)

- Path: a key used by several apps is `/sirloinbh/shared/<name>`, and a key used by only one app is `/sirloinbh/<app>/<name>`. The data.go.kr (public data portal) key is one per account, so it gets one shared path.
- Which parameter goes into which variable is written with the `@ssm=` tag in `.env.example`.
- A value the app receives while running, such as an OAuth refresh token, is kept in the app DB, not in SSM.

## Checks

- Conditions of external services were checked by web research, and the document distinguishes official sources, secondary sources, and unconfirmed items. No sign-up or issuance was done.
- `npm run check`: the result is written in the PR body.
