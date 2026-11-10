# Shared domain and per-app subdomain approach (#248)

Surveyed on 2026-10-28. Prices were confirmed by web search (see "Sources" below). Registrar prices change often, so check them again just before buying. Nothing was purchased or configured. The result the user chose is in "Decisions" at the bottom and in [ADR-0012](../adr/0012-shared-domain-subdomains.md). The recommendation in section 8 and the decision use different registrars.

## 1. Current state

- Server: 8 apps on one Lightsail instance (ADR-0009). Web ports 8101 to 8108, one per app.
- Firewall (shared-aws-infrastructure `main.tf`): only 22 and 80 are open, and both are open only to allowed IPs (`allowed_cidrs`). Variable validation blocks `/0` (open to everyone).
- Registry: both `rootDomain` in `platform.json` and the per-app `service.subdomain` are `null`.
- The apps have no login (workout-memo#107 planned). So if exposed publicly, anyone can see the data.

## 2. Domain and registrar

| Registrar | .com per year (registration = renewal) | WHOIS privacy | Notes |
|---|---|---|---|
| Cloudflare Registrar | about $10.46 | Free | Sold at cost (wholesale + ICANN fee). DNS must be on Cloudflare |
| Porkbun | renewal about $11.08 | Free | |
| Namecheap | renewal $19.98 (from 2026-11-01) | Free | |
| Route 53 | $16 (from 2026-07-01. Confirmed 2026-11-01) | Free | Managed in the same AWS account. A hosted zone is created together on registration |

- The .com wholesale price rises from $10.26 to $10.97 on 2026-11-01. Some of the other registrar prices above may not reflect this increase.
- I confirmed the Route 53 price in two articles that quote the AWS price list. I could not read the body of the AWS price list PDF directly, so check again on the purchase screen.
- The user picks the domain name candidates (short and not overlapping with a personal name).

## 3. Where to manage DNS

| Location | Cost | Terraform | Certificate DNS validation | Verdict |
|---|---|---|---|---|
| Route 53 | Hosted zone $0.50 per month, $0.40 per million queries | `aws_route53_zone`, `aws_route53_record` (same provider as the current infrastructure repo) | certbot `dns-route53` plugin (official image). Keep on the server an IAM key that can change only this zone | **Recommended** |
| Lightsail DNS | Zone is free (limit of 3 to 6 zones, official figure needs checking) | `aws_lightsail_domain_entry` | No official certbot plugin | Not recommended. DNS validation is hard to automate |
| Cloudflare DNS | Free | A separate `cloudflare` provider and API token | certbot `dns-cloudflare` plugin | Possible. One more account and token to manage |

- The registrar and the DNS location can be chosen separately. Example: buy at Porkbun and point only the nameservers to Route 53. Cloudflare Registrar requires DNS on Cloudflare.

## 4. Subdomain names

| Rule | Example | Verdict |
|---|---|---|
| Registry `name` as is | `workout-memo.<domain>`, `study-log.<domain>` | **Recommended.** The 8 already do not overlap and match the repo names, so there is no confusion |
| DB name (short name) | `workout.<domain>`, `study.<domain>` | Shorter, but there become two sets of names |

- Format checks (to add to the registry conflict check): lowercase letters, digits, hyphens, at most 63 characters, no overlap between apps, and reserved names such as `www`, `api`, and `mail` are banned.

## 5. Reverse proxy and certificates

Put one proxy on the server, accept 443, and forward to `127.0.0.1:810x` (the app web container).

| Approach | Certificate | Firewall | Image | Verdict |
|---|---|---|---|---|
| nginx + certbot (`dns-route53`), wildcard `*.<domain>` | DNS-01. 90 days, renewed automatically by a timer | Only 443 needs to be open to allowed IPs. No need to open 80 to everyone | Both are official images (`nginx`, `certbot/dns-route53`) | **Recommended** |
| Caddy, per-subdomain certificates (HTTP-01, TLS-ALPN-01) | Automatic issuance and renewal | Let's Encrypt checks from several places, so 80 or 443 **must be open to everyone** | Official image | Not recommended. Does not fit the current "allowed IPs only" rule |
| Caddy + Route 53 module, wildcard | DNS-01, automatic | Allowed IPs only | Build your own image with the module (`xcaddy`) | Not recommended. A self-built image has to be maintained continuously |

- nginx is already used in the apps' web containers, so the configuration style is the same. The proxy config is generated from the registry so nobody edits it by hand when adding a subdomain (#251).
- One wildcard certificate covers the 8 apps. Adding a subdomain needs no new issuance.

## 6. Access restriction

| Approach | Content | Verdict |
|---|---|---|
| A. 443 also for allowed IPs only | The current rule as is. Cannot get in from places where the IP changes, such as a phone data network | **Recommended, for now.** Because the apps have no login |
| B. 443 open to everyone + app login | Access from anywhere, PWA install and the Play Store become possible | After app login (workout-memo#107), per app. For the Play Store (TWA), Google reads `assetlinks.json`, so it must be public |
| C. 443 open to everyone + proxy Basic auth | Can block access even without a login | Temporary only. Inconvenient for PWA and mobile |

- With DNS-01, certificates can be obtained even under A. Keep 80 open only to allowed IPs as now, and close it after moving to HTTPS.

## 7. Cost

| Item | Per year |
|---|---:|
| .com domain (Cloudflare or Porkbun basis) | about $10.5 to 11 |
| Route 53 hosted zone $0.50 × 12 | $6 |
| Certificate (Let's Encrypt) | $0 |
| **Total** | **about $17 (about 24,000 KRW, at 1,400 KRW per dollar)** |

## 8. Summary of recommendations

| Item | Recommendation |
|---|---|
| Domain | One .com, bought at Porkbun or Cloudflare (cheaper if before 2026-11-01) |
| DNS | Route 53 (managed in shared-aws-infrastructure with Terraform) |
| Subdomain | Registry `name` as is |
| Proxy | One nginx on the server |
| Certificate | Let's Encrypt wildcard, certbot `dns-route53` (DNS-01) |
| Access | For now, 443 also for allowed IPs only. Open per app once app login exists |

If you buy at Cloudflare, DNS must also be on Cloudflare, so to combine with the recommended setup (Route 53), a registrar whose nameservers can be changed, like Porkbun, is the right fit.

## Sources

- Route 53 pricing: [costgoat](https://costgoat.com/pricing/route-53), [wring.co](https://wring.co/blog/aws-route53-pricing-guide)
- .com prices: [Cloudflare (costgoat)](https://costgoat.com/pricing/cloudflare-domains), [Namecheap notice](https://www.namecheap.com/support/knowledgebase/article.aspx/10840/2201/com-price-change-november-1-2026/), [Verisign increase](https://osir.com/en/blog/verisign-com-price-update-2026/), [dev.to comparison](https://dev.to/devtoolpicks/best-domain-registrars-for-indie-hackers-in-2026-cloudflare-vs-porkbun-vs-namecheap-2ebm)
- Route 53 .com prices: [AWS pricing page](https://aws.amazon.com/route53/pricing/) (links to the price list PDF), [Classmethod](https://dev.classmethod.jp/en/articles/route53-tld-pricing-change-2026/), [CostGoat](https://costgoat.com/pricing/route-53-domains)
- Lightsail DNS: [AWS docs](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-register-new-domain.html), [re:Post](https://repost.aws/questions/QUPqWChU-JS_6Rtba5mAwv8w/i-want-to-increase-the-limit-of-lightsail-domains-with-route-53)

## Decisions

2026-11-01. The user chose "manage everything in AWS". So the registrar is Route 53 instead of the recommended Porkbun, and the total is about $22 per year (about 30,800 KRW). The rest is as recommended.

| Item | Decision |
|---|---|
| Domain | One `.com`, registered at Route 53. The name is decided at purchase (#249) |
| DNS | Route 53 |
| Subdomain | Registry `name` as is |
| Proxy and certificate | One nginx, Let's Encrypt wildcard, certbot `dns-route53` |
| Access | 443 also for allowed IPs only. Open per app once app login exists |
