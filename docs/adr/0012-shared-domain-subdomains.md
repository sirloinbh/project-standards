# 0012. Access through per-app subdomains of one shared domain

- Status: Accepted (issue #248)
- Date: 2026-11-01
- Changes a decision: the "access" part of [ADR-0009](0009-multi-app-single-lightsail.md). Until the subdomain switch (#254) is finished, ADR-0009's per-app web port access continues to be used as is.

## Context

- `rootDomain` in `registry/platform.json` and each app's `service.subdomain` are empty. ADR-0009 decided to write a new ADR switching to a host reverse proxy and subdomains once a domain exists.
- The firewall is open only to allowed IPs, and the apps have no login (workout-memo#107 planned). If made public, anyone could see the data.
- The comparison is in [docs/research/domain.md](../research/domain.md). The user chose "manage everything on AWS" and chose the recommended option for the other items (2026-11-01).

## Decision

| Item | Decision |
|---|---|
| Domain | Register one `.com` in Route 53. The user decides the name at purchase (#249) |
| DNS | Use the hosted zone that Route 53 creates at registration. The zone and records are managed with shared-aws-infrastructure Terraform |
| DNS records | One subdomain A record per app. No wildcard A record is set, so names that are not registered do not reach the server |
| Subdomain | The registry `name` as is (`workout-memo.<domain>`) |
| Proxy | One nginx on the server takes 443 and forwards to each app's web port. The config is generated from the registry |
| Certificate | One Let's Encrypt wildcard (`*.<domain>`). DNS validation with certbot `dns-route53` |
| Access | 443 is also opened only to allowed IPs. When app login exists, decide public access per app |

Lightsail DNS is also inside AWS, but it is not used because certbot has no official plugin for it, which makes automatic certificate renewal hard.

## Consequences

- **Cost:** About $22 per year ($16 for the domain, $6 for the hosted zone). This is about $5 per year more than buying from another provider, but the account and billing are consolidated in AWS. The amounts are in [costs.md](../costs.md).
- **Firewall:** There is no need to open 80 to everyone to get the certificate. The `/0` ban check in shared-aws-infrastructure stays as is.
- **Access scope:** Places where the IP changes, such as a phone's mobile data network, cannot connect the way they do now. The Play Store (TWA) needs Google to read `assetlinks.json`, so it cannot proceed before the apps are made public.
- **Server key:** For the Lightsail server to renew the certificate, one more AWS key is needed. Its permission is narrowed so it can only change records in this hosted zone, and the value is kept only on the server.
- **Failure scope:** If the proxy or certificate has a problem, access to all 8 apps breaks together. How to notice a renewal failure was decided in #251: the renewal timer pings healthchecks.io (`HEALTHCHECK_URL_CERT`, [server-proxy.md](../server-proxy.md)).

## Follow-up work

| Issue | What this decision settled |
|---|---|
| #249 | Buy in Route 53. The hosted zone is created with it and the name servers are connected, so there is no delegation step |
| #250 | The subdomain value is the same as `name` |
| #251 | Build the template with the official nginx and certbot `dns-route53` images |
| #252 | Import the automatically created hosted zone into Terraform. Creating a new zone would mismatch the name servers. 80 is not opened to everyone, and 443 is opened to allowed IPs |
| #254 | When the switch is finished, close the app web ports (8101–8108) and 80 externally |
