# 554. Error alerts from the JSON logs: no error tracker for now

## Change

- `docs/adr/0021-error-alerts-from-logs.md`: ADR (accepted 2026-11-18). No error tracker (Sentry, GlitchTip), hosted log service (Better Stack, Grafana Cloud), or log viewer (Dozzle) for now. The daily `report.sh` counts `"level":"error"` lines from the last 24 hours, adds `errors=N` and up to 5 request IDs with status and path to the report line, and sends `fail` when N is over `REPORT_ERROR_LIMIT` (default `0`). Before a deploy recreates the api container, `remote-deploy.sh` saves its error lines so the daily count still sees them (added in review). Lists the triggers for deciding again.

## Reason

- Since #552 errors are searchable but nothing alerts on them. The expected volume is a few errors a day.
- Hosted options send stack traces or every log line with personal data to a third party; GlitchTip needs 256 to 512 MiB of the roughly 900 MiB left on the 2 GB server; Dozzle gives no alert and needs the Docker socket with several CVEs in 2026, some rated high. The existing report and healthchecks.io channel close the gap at no memory or money cost.

## Verification

- Facts checked on 2026-11-17: Sentry pricing, data storage location, and self-hosted requirements; Better Stack and Grafana Cloud free tiers and their shippers (Vector, Alloy sizing); GlitchTip install requirements, releases, and hosted plan; Dozzle README and its 2026 CVEs. Existing alerts read from `templates/app/deploy/notify.sh.tmpl` and `report.sh.tmpl`; Docker log limits from `shared-aws-infrastructure/user-data.sh`.
- `npm run check`: see the PR.

## Follow-up

- Accepted by the user on 2026-11-18. Next: one issue for the error count in `templates/app/deploy/report.sh.tmpl` (with tests and docs), one for the same report in shared-auth.
