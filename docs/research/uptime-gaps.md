# Closing the gaps in app uptime checks (#1058)

- Status: the user chose option (A) with an issue-only token in SSM (2026-11-23). The addendum "Can AWS do the judging instead of healthchecks.io?" at the end is a recommendation waiting for the user's pick. Implementation issues are registered under #1051.
- Date: 2026-11-23
- Builds on: [ADR-0009](../adr/0009-multi-app-single-lightsail.md) (one server, IP allow list), [ADR-0012](../adr/0012-shared-domain-subdomains.md) (one nginx, subdomains), [ADR-0014](../adr/0014-app-secrets-ssm-paths.md) (secrets in SSM), [ADR-0015](../adr/0015-shared-sign-in.md), [ADR-0021](../adr/0021-error-alerts-from-logs.md), [deploy runbook 4-1](../runbooks/deploy.md)

## What exists today

| Signal | Where it runs | What it checks |
|---|---|---|
| `health` | `<app>-health.timer`, every 5 minutes | `GET http://127.0.0.1:<WEB_PORT>/api/health` on the server, then a ping to healthchecks.io ([`notify.sh`](../../templates/deploy/deploy/notify.sh.tmpl)) |
| `deploy`, `backup`, `restore`, `report` | server timers | build and deploy result, nightly dump, weekly restore, memory and disk plus error count |
| `cert` | the certbot renewal timer | renewal or nginx reload failure ([server-proxy.md](../server-proxy.md)) |

An alert is an email from healthchecks.io. A missing ping also raises it, so a dead server is noticed.

## The gaps

1. **The public path is not checked.** The health timer calls `127.0.0.1:<web port>`. Nothing exercises the host nginx proxy, its server block for the subdomain, the TLS certificate it serves, DNS for `<app>.daysofme.com`, or the app's own nginx behind the proxy. If the proxy or the certificate breaks, all 8 apps break together ([server-proxy.md](../server-proxy.md)) while every `health` ping stays green.
2. **Alerts are email only.** Nothing opens an issue, so a failure is not on the backlog and is not found by an agent session.
3. **A GitHub-hosted runner cannot do the check.** The Lightsail firewall opens 80 and 443 only to `allowed_cidrs` (ADR-0012, #252), and GitHub runner addresses change. A scheduled workflow would see a timeout on every run.
4. **Limit of the free plan.** healthchecks.io Hobbyist allows 20 checks ([pricing](https://healthchecks.io/pricing)). The runbook lists 5 per-app checks; with 8 apps that is 40, plus `cert`. Only the apps in operation can have them today. This problem exists already and any per-app addition makes it worse, so the recommendation adds one shared check, not eight.

What a public probe can see without a sign-in: `/api/health` is the one API route exempt from the shared sign-in ([`auth.ts`](../../templates/app/backend/src/standard/auth.ts)), and `/` serves the app shell from the app's own nginx. The shared sign-in service sits behind the same proxy under its own subdomain.

## Targets

Built from the registry, so a new app is covered without touching the check: `https://<service.subdomain>.<platform.rootDomain>` for every active project and each entry of `sharedServices` (today 8 apps, `auth`, `ai`). The script is rendered from `registry/projects.json` and `registry/platform.json` the same way `scripts/proxy-config.mjs` renders `apps.conf`, and the list is regenerated with the proxy files.

## Options

| | (A) One server timer that probes the public URLs through the proxy | (B) healthchecks.io webhook opens the issue | (C) The same timer opens and closes the issue itself | (D) Probe after each deploy in `autodeploy.sh` | (E) Outside monitor admitted by the firewall |
|---|---|---|---|---|---|
| Catches | Proxy, TLS, nginx server block, the app behind it, the shared sign-in route. With `dig` against a public resolver also a lost DNS record. Not the firewall or the outside path | Nothing new; it changes the alert channel only | Same as (A), plus an issue per incident | Only a break at deploy time | Everything, including the firewall rule |
| Cost | 0: one script and one more healthchecks.io check (1 of the free 20) | 0, if the plan lets a webhook send custom headers and a JSON body (not verified here) | 0 | 0 | Free tiers exist, but see "Reject (E)" |
| Secrets | None new (the ping URL is the existing kind of secret) | A GitHub token with Issues write, stored at healthchecks.io, outside SSM | A GitHub token with Issues write, in SSM, read by the script (ADR-0014) | None | An account at the vendor |
| Dedupe and recovery | Email only | One issue per down event; nothing closes it | The script knows the state: opens one issue, comments while down, closes on recovery | None | Vendor-dependent |
| Dead server | A missing ping raises the email | Same | Same; no issue is opened while the server is down because nothing runs | n/a | Seen from outside |
| Upkeep | One template | One webhook to maintain at the vendor | One template and one token rotation | A few lines | A list of vendor IP ranges |

**Reject (E).** The probe addresses of such monitors are many and change, and each would need a firewall rule. That turns "owner IPs only" (ADR-0009, ADR-0012) into "owner plus a vendor's fleet", for 8 apps that hold personal data. Not worth it before the apps are public.

**(D) is a bonus, not the answer.** It runs only when a commit deploys; a certificate or proxy break at 03:00 is not seen. One `curl` of the public health URL at the end of a deploy is cheap and can follow later.

**(B) versus (C).** (B) is less code but writes a token to a third party and gives an issue per down event with no recovery. (C) keeps the token on our server in SSM, and the script can tell "still down" from "new" and close the issue. A token on the server is a risk only as large as an Issues-write token for one repo. Recommended: (C).

## Recommendation

(A) with (C):

1. A `public-check` script and timer in the shared deploy templates, installed once for the whole server (it uses the registry list, not one app). Every 5 minutes it probes each target:
   - `curl --resolve <host>:443:127.0.0.1 https://<host>/api/health`, expecting 200, with a 10 s timeout. This goes through the real nginx, certificate, proxy and app. `--resolve` avoids depending on the server reaching its own public address through the firewall (not verified; a test of that is a task of the implementation issue).
   - `dig +short <host> @1.1.1.1` compared with the server's public IP, to notice a lost or changed DNS record. Done once an hour to save lookups.
   - The days left on the served certificate; fail under 14 days, as a second line behind the `cert` check.
2. One new healthchecks.io check `public` (period 5 minutes, grace 10 minutes), pinged `ok` or `fail` with the names of the failing hosts in the body (no secret in the body). That is 1 more check, not 8.
3. On a change of state it opens an issue in `sirloinbh/project-standards` (title `Uptime: <host> is down`, label `area/deploy`, a body with the failing probe and the time), comments on it once an hour while it stays down, and closes it with a comment on recovery. The token is a fine-grained token for that one repo with Issues write, in SSM under the project-standards prod path (the exact name is set in the implementation issue, following ADR-0014). The server reads it through `ssm-get.sh` like the other secrets.

## Implementation issues

- #1076: probe script, timer, installer and tests with a fake `curl` and `dig`.
- #1077: open and close issues from the probe, with the SSM token and the runbook step (needs the user: create the token and the SSM parameter, and the new healthchecks.io check).

## Open points for the user

- Is option (A)+(C) the choice?
- Is a fine-grained GitHub token with Issues write on `sirloinbh/project-standards`, held on the server in SSM, acceptable? If not, (B) is the fallback and the webhook details need checking at healthchecks.io first.
- The free plan has 20 checks and 8 apps at 5 per-app checks is 40. Which apps get which checks before the others are deployed, or should the plan move to the 100-check tier? This is outside this issue but decides whether `public` fits.

## Addendum (2026-11-23): can AWS do the judging instead of healthchecks.io?

The user asked this after seeing the 20-check limit. The question is where the decision "is a signal late or failing?" is made, and who sends the email. Today it is healthchecks.io: the server pings, and a late or `fail` ping raises an email.

### Signals to cover

8 apps × 5 per-app signals, plus `cert` and the new `public` probe: 42 signals. Prices come from the [CloudWatch pricing page](https://aws.amazon.com/cloudwatch/pricing/) (custom metric $0.30 a month, free tier of 10 custom metrics and 1 million API requests, and a separate free allowance of 10 alarms) and the [Route 53 pricing page](https://aws.amazon.com/route53/pricing/) ($0.50 a month per basic health check on an AWS endpoint, $0.75 on another endpoint, $1.00 or $2.00 more for options such as HTTPS). **Not verified here:** the exact price of a standard CloudWatch alarm (taken as $0.10 a month from memory), whether Lightsail metric alarms cost anything, and how many CIDRs a Lightsail firewall rule accepts. Check these before building.

### Options

| | (1) The server sends heartbeats and failures to CloudWatch and SNS | (2) Route 53 health checks | (3) Lightsail metric alarms |
|---|---|---|---|
| How it judges | The probe timer calls `PutMetricData` every 5 minutes. An alarm on the heartbeat treats missing data as breaching (a dead-man switch); an alarm on a failure count fires above 0. SNS emails | AWS probes the public HTTPS URL from many regions; an alarm on `HealthCheckStatus` (metrics exist only in us-east-1) emails through SNS | Lightsail alarms on instance metrics (CPU, status check failed, network) with a contact method |
| What it catches | Everything the server already knows: the 5 per-app signals, `cert`, `public`, and a dead server or stopped timer (missing heartbeat) | Only the public path of each watched URL, from the outside (DNS, TLS, proxy, app, and the firewall rule itself) | Only a dead or overloaded instance, not a single app |
| Cost, 42 signals as 42 metrics | About 42 × $0.30 less the free 10 = $9.60, plus 42 alarms at $0.10 less the free 10 = $3.20: roughly $13 a month | About $1.75 per watched HTTPS URL; the 9 public hosts would be about $16 a month, the proxy alone about $1.75 | Not verified, believed to be nothing for instance alarms |
| Cost, 2 metrics (see below) | 2 custom metrics and 2 alarms fit in the free tier: $0. About 17,000 requests a month, far below 1 million. SNS email is free for the first 1,000 a month | n/a | n/a |
| Server permission | A new IAM user (not the upload-only S3 key of shared-aws-infrastructure #104) with `cloudwatch:PutMetricData` limited by the condition `cloudwatch:namespace` to one namespace, and `sns:Publish` on one topic ARN | None on the server. Terraform needs Route 53 health checks, `cloudwatch` and `sns` | None on the server. Created with the CLI; there is no Terraform resource |
| Replaces healthchecks.io fully? | Yes for judging and email, if every signal goes through one sink function. Lost: the per-check log with ping bodies and the grace-period UI; the script writes the failure names into the SNS message itself | No: it cannot see backup, restore, deploy or report. It adds the outside view | No |
| Firewall effect | None | 80 and 443 must admit the Route 53 health checker ranges (`aws_ip_ranges`, service `ROUTE53_HEALTHCHECKS`, as #99 plans). Any AWS customer can create a health check against our IP, so this weakens "owner IPs only" (ADR-0009, ADR-0012) | None |
| Fit with #99 | Satisfies "email within a few minutes when the proxy or a core app stops" through the missing-heartbeat alarm, with no firewall change; #99 would drop its Route 53 part | #99 as written (proxy and one or two core apps) | Mentioned in #99 as the instance-level view |
| Fit with #98 | Needs `cloudwatch:*` and `sns:*` in the Terraform boundary, which #98 already lists. Resources: topic, email subscription, two alarms, one IAM user and policy | Needs Route 53 health checks plus the same `cloudwatch` and `sns`; the alarm and topic go in a us-east-1 provider alias | None (CLI only) |
| Terraform apply | A user step, as always | A user step | A user step with the CLI |

### Keeping the count small

42 metrics is the expensive way. The cheap way keeps the judging on the server and sends two numbers:

- `HeartbeatOk` (1 per probe run, every 5 minutes). Alarm: no data for 15 minutes counts as breaching, so a dead server, a stopped timer, a broken network, or a revoked key all send an email.
- `FailingSignals` (how many signals are failing or stale on the server right now). Alarm: above 0 for one period.
- On a change of state the script also calls `sns:Publish` with the names of the failing signals, because a CloudWatch alarm email carries the alarm name, not the host list. The same state change opens or closes the GitHub issue of #1077.
- Per-signal staleness (the nightly backup did not run, the weekly restore check is a day late) is judged on the server from the time of the last success, so it needs no grace setting at a vendor. The server can judge only while it runs; the heartbeat alarm covers the rest.

### Recommendation

Option (1) with two metrics: $0, no firewall change, no limit of 20, one place to look (an alarm email plus a GitHub issue). Do not open the firewall to Route 53 for now. #99 then shrinks to "heartbeat alarm and SNS topic"; a Route 53 health check on the proxy alone stays an optional later step if the user wants the outside view and accepts the firewall change. Keep healthchecks.io running for a trial of a few weeks, then retire it if the AWS path proved itself. `notify.sh` becomes a small sink function (`NOTIFY_SINK=healthchecks|aws|both`), so the switch is a server `.env` setting.

Constraints that stay: the server key is separate from the upload-only S3 key and is rotated with the #104 procedure. The probe, the state tracking and the GitHub issue logic (#1076, #1077) do not depend on the sink.

### Follow-up issues if the user picks (1)

- Central: the `notify.sh` sink function and the two-metric emitter (templates, tests with a fake `aws` command).
- shared-aws-infrastructure: IAM user and policy, SNS topic and email subscription, the two alarms (after #98; a user apply). This replaces the Route 53 part of #99.
