# #1087 Write a GitHub deployment record from autodeploy

- Issue: [#1087](https://github.com/sirloinbh/project-standards/issues/1087) (stays open until the user stores the token and one app's deploy shows a record)
- Branch: `feat/1087-deploy-record`
- Parent: #1051

## Changes — 2026-11-26

- `templates/deploy/deploy/autodeploy.sh.tmpl`: after `remote-deploy.sh` succeeds (so after the health check), `deploy_record` creates a deployment (`environment: production`, `ref` = the deployed commit, `auto_merge: false`, no required contexts) and a `success` status. The token comes from SSM `/sirloinbh/shared/github-ops-token` through `deploy/ssm-get.sh` and goes to curl on standard input. It is skipped silently without `ssm-get.sh` or a token; an SSM or GitHub error prints one line; the function and its call always end with status 0, so the deploy is never failed or rolled back by it.
- User decision 2026-11-26: one fine-grained token shared with #1077 (Deployments: write on the 8 app repos, Issues: write on project-standards), not a GitHub App installation token. The path is the one #1109 named.
- Docs: `docs/runbooks/deploy.md` (section 4), `docs/server-proxy.md` (token section).
- Left for the user: store the token at `/sirloinbh/shared/github-ops-token`; after the sync PRs reach the apps, check that one app's deploy shows a record.

## Verification

- `node --test scripts/test/autodeploy-record.test.mjs`: 10 passed for an app and a service target (called once in the success branch; deployment and status calls; token only on stdin; silent without a token; one line and status 0 when GitHub is down).
- `npm run check`: see the PR.
- Not verified: a real GitHub call (no token yet).
