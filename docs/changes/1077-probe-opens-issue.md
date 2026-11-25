# #1077 Open and close an issue from the public-URL probe

- Issue: [#1077](https://github.com/sirloinbh/project-standards/issues/1077) (stays open until the user stores the token and one real open/close is seen)
- Branch: `feat/1077-probe-opens-issue`
- Parent: #1051. Decision: [docs/research/uptime-gaps.md](../research/uptime-gaps.md) (#1058, option C, confirmed 2026-11-26)

## Changes — 2026-11-26

- `scripts/lib/public-check.mjs`: `public-check.sh` keeps a state file per host and, after each run, opens one issue per outage, comments once an hour, and comments and closes on recovery. It reads the token from SSM `/sirloinbh/shared/github-ops-token` with the same signed `curl` call as `ssm-get.sh` (the probe is server-wide, so it cannot use the per-app `ssm-get.sh`). Without the SSM key pair, the token, or when SSM or GitHub fail, the step is skipped and the exit code and the signal do not change.
- User decision 2026-11-26: the healthchecks.io `public` check is dropped (docs/runbooks/deploy.md says so). The token is shared with #1087 (Issues: write on project-standards, Deployments: write on the 8 app repos); this PR names the SSM path.
- Docs: `docs/server-proxy.md` ("Operations token and uptime issues": path, scopes, rotation, state), `docs/runbooks/deploy.md`.
- Left for the user: create the token and store it at `/sirloinbh/shared/github-ops-token`; the old step 6 of `docs/user-steps.md` section 11 (create the healthchecks.io `public` check) is no longer needed.

## Verification

- `node --test scripts/test/public-check.test.mjs`: open, no duplicate, no comment before an hour, hourly comment, close on recovery, nothing called when quiet, token never in output or arguments, skipped silently without keys, token or GitHub, quick run cannot close a DNS incident.
- `npm run check`: see the PR.
- Not verified: a real GitHub call (no token yet).
