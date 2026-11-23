# #1091 Sink switch for server signals: NOTIFY_SINK=healthchecks|aws|both

- Issue: [#1091](https://github.com/sirloinbh/project-standards/issues/1091)
- Branch: `feat/1091-notify-sink`
- Parent: #1051. Research: addendum in [docs/research/uptime-gaps.md](../research/uptime-gaps.md). Pairs with shared-aws-infrastructure#105 (IAM user, SNS topic, two alarms; the user applies it).

## Changes — 2026-11-23

- `templates/deploy/deploy/notify.sh.tmpl`: `ping_check` now picks the sink from `NOTIFY_SINK` (app `.env` first, then the shared `/opt/project-standards/.env`; default `healthchecks`, so nothing changes until it is set). `healthchecks` is the old ping. `aws` records the state with `signals.sh record`. `both` runs both and returns 1 if either failed; one failing sink never stops the other. An unknown value warns and uses `healthchecks`. `notify.sh ping` and `notify.sh health` keep their arguments and exit codes.
- `scripts/lib/signals.sh` (generated into the proxy files as `signals.sh`, added in `scripts/lib/signals.mjs` and `proxy.mjs`): the server-wide emitter.
  - `record <app> <check> ok|fail` keeps the latest state per signal in `/var/lib/project-standards/signals/`. The message text is never stored.
  - `evaluate` counts failing signals (last record `fail`, or stale: no record within 15 minutes for health and public, 30 minutes for deploy, 26 hours for backup and report, 8 days for restore), sends `HeartbeatOk` (1) and `FailingSignals` in one `PutMetricData` call, and publishes to SNS once when the failing set changes and once on recovery, with signal names only. The state file moves only after a successful publish.
  - `status` prints the signals; `call` sends one signed request.
- `public-check.sh`: `send_signal` takes the same `NOTIFY_SINK` (it replaces the unreleased `PUBLIC_CHECK_SINK`). With `aws` or `both` it records `server.public` and runs `signals.sh evaluate`, so the 5-minute probe run is the heartbeat.
- Docs: `docs/server-proxy.md` ("AWS alert path", shared `.env` keys), `docs/runbooks/deploy.md` 4-1, `docs/user-steps.md` section 11 step 7.

## Deviation from the issue text

The issue says `aws cloudwatch put-metric-data` and a fake `aws` in tests. The server has no AWS CLI (the S3 upload and `ssm-get.sh` use curl's built-in SigV4 for that reason), so the emitter calls CloudWatch and SNS through `curl --aws-sigv4`, with the key pair on standard input. Tests use a fake `curl`. No package to install on the server.

## Reusable AWS helpers (for shared-auth#36, SES)

All in `signals.sh`, no second AWS path:

| Piece | Where |
|---|---|
| Credentials | `AWS_ALERT_ACCESS_KEY_ID` and `AWS_ALERT_SECRET_ACCESS_KEY` in the shared server `.env` (never printed) |
| Region, namespace, topic | `AWS_ALERT_REGION` (default `ap-northeast-2`), `AWS_ALERT_NAMESPACE` (default `ProjectStandards/Uptime`), `AWS_ALERT_TOPIC_ARN` |
| Signed request | `aws_call <service> <Field=value>...` (function) and `signals.sh call <service> <Field=value>...` (command): services `monitoring`, `sns`, and `ses` (host `email`, AWS query API, e.g. `Action=SendEmail`) |
| The policy of the IAM user | Must allow the action. #105 grants only `PutMetricData` in one namespace and `sns:Publish` on one topic; SES needs its own statement there |

## Verification

- `node --test scripts/test/signals.test.mjs`: 10 passed (CloudWatch call and signing, key on stdin only, state change publishes once, recovery, stale signal, failed publish retried, missing key, `call`, each notify sink alone, `both` with either side failing, unknown sink, public-check with `aws` and `both`).
- `node --test scripts/test/deploy-notify.test.mjs scripts/test/public-check.test.mjs scripts/test/proxy.test.mjs`: pass.
- `npm run check`: see the PR.
- Not run: against real AWS (needs #105 applied; user step in `docs/user-steps.md`).
