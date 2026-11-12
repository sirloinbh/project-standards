# #248 Decision on a shared domain and per-app subdomains

## Change

| File | Content |
|---|---|
| `docs/adr/0012-shared-domain-subdomains.md` | Decisions on domain, DNS, subdomains, proxy, certificate, and access, plus what was settled for follow-up issues |
| `docs/adr/0009-multi-app-single-lightsail.md` | Marks that ADR-0012 supersedes the "access" decision |
| `docs/research/domain.md` | Filled in the Route 53 .com price and recorded the decision. Fixed the ADR number to 0012 |
| `docs/costs.md` | Added a domain cost table ($22 per year) |

## Decisions

- The user chose "manage everything with AWS". Both domain registration and DNS go to Route 53. The other items follow the recommendation.
- The ADR number is 0012 because #354 used 0011 first.
- Subdomains get one A record per app, and no wildcard A record. This was decided without asking the user, so that unregistered names do not reach the server. The certificate is a single wildcard.
- The domain is not purchased yet, so the monthly total in section 2 and the per-app table in section 4 are unchanged.

## Checks

- Route 53 hosted zone and query prices were checked on the AWS pricing page (2026-11-01).
- The `.com` $16 is the value from two articles that quote the AWS price list. We could not read the body of the price list PDF, so confirm it again on the purchase screen.
- No purchase, DNS, or Terraform change was made.
