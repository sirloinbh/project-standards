# Closing the gaps in app uptime checks (#1058)

- Status: recommendation, waiting for the user's confirmation (sent to the coordinator on 2026-11-23). Implementation issues are registered under #1051 (see below).
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
