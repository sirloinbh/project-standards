# #1060 Decide whether the apps need shared tracing and metrics beyond requestLog

- Issue: [#1060](https://github.com/sirloinbh/project-standards/issues/1060), epic #1051
- Branch: `docs/1060-tracing-metrics`

## Changes — 2026-11-23

- New `docs/research/tracing-metrics.md`: what exists, a scan of 147 bug issues since 2026-10-23 (none says the logs could not answer; the log problems found were format gaps, fixed in #1003 and #1036), four options, and the recommendation: no OpenTelemetry, no metrics service, no log package.
- One real gap found: the request ID does not reach the auth service (auth-client sends only the cookie). Registered #1082 under #1051 (P4).

## Verification

- `npm run check:docs`
