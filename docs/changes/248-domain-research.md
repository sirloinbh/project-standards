# #248 Research on a shared domain and per-app subdomains

## Change

| File | Content |
|---|---|
| `docs/research/domain.md` | Domain and registrar, DNS location, subdomain names, proxy and certificate, access restriction, cost, and the recommendation |

## Decisions

- Research only. No purchase, setup, or code change.
- The recommendation is a combination that keeps the current firewall rule "open only to allowed IPs" (the `/0` ban check in shared-aws-infrastructure). So for certificates it recommends DNS-01 (wildcard), which does not need port 80 open to everyone.
- The ADR will be written after the user chooses.

## Verification

- Prices were checked by web search and the sources are in the document. The Route 53 .com registration price and the Lightsail DNS zone limit could not be confirmed from official figures, so they are marked "to be confirmed".
- The firewall and DNS status were checked by reading `main.tf` and `variables.tf` on `origin/main` of shared-aws-infrastructure.
