# AWS costs and per-app allocation

This is the monthly cost of running 8 apps together on one server in the Seoul region (`ap-northeast-2`), and the basis for splitting that cost by app. The amounts are **examples** calculated from the official price lists and are not actual bills. Account IDs, resource identifiers, and secrets are not written in this document.

- Price check date: 2026-10-15 (Asia/Seoul). The original was workout-memo `docs/shared-hosting-costs.md`, and we moved it to this document (#41).
- I did not do an actual deployment, a load test, or a lookup of the account's billed amount.
- The app list and the phase each app belongs to follow the [project overview](projects.md) (source: `registry/projects.json`).

## 1. Assumed setup

- 8 apps run together on one server (Lightsail, Linux).
- The setup follows [ADR-0009](adr/0009-multi-app-single-lightsail.md). Each app has its own compose and postgres container (`workout`, `study` ...), and images are built on the server. There is no image registry (ECR) cost.
- Server backups use Lightsail snapshots ([backup and restore template](runbooks/backup-restore.md)).
- If the one server stops, all 8 apps stop. It is not a high-availability setup.

## 2. Monthly cost (total for the whole server)

The figures below are **not a per-app price but the total for the whole server**. They assume running all month, usage within the included traffic, and no free tier, signup credits, or commitment discounts.

| Item and formula | 2 GB server | 4 GB server |
|---|---:|---:|
| Lightsail base price (public IPv4 and SSD included) | $12.00 | $24.00 |
| Lightsail snapshot: 20 GB-month × $0.05 | $1.00 | $1.00 |
| **Monthly total, before tax** | **$13.00** | **$25.00** |

The Lightsail base prices by spec are 0.5 GB $5, 1 GB $7, 2 GB $12, and 4 GB $24. With 0.5–1 GB there is almost no headroom to run 8 apps and 8 postgres instances all the time and to build images on the server, so start by considering 2 GB, and raise to 4 GB after looking at the actual memory usage. Whether each spec can actually run this has not been verified yet.

### Conversion to Korean won (for illustration)

This assumes an exchange rate of $1 = 1,400 KRW and 10% VAT. Pre-tax won = monthly USD × 1,400, and after-tax won = pre-tax won × 1.10.

| Setup | Monthly pre-tax won | Monthly after-tax won |
|---|---:|---:|
| 2 GB: $13.00 | 18,200 KRW | 20,020 KRW |
| 4 GB: $25.00 | 35,000 KRW | 38,500 KRW |

This is not a live exchange rate or an actual payment amount. It varies with the payment exchange rate, taxes, and card fees.

### Domain (before purchase)

If you buy as in [ADR-0012](adr/0012-shared-domain-subdomains.md), the costs below are added. We have not bought it yet, so it is not included in the total above or in the per-app table in chapter 4. Recalculate after the purchase (#249).

| Item | 1 year |
|---|---:|
| `.com` domain (Route 53 registration and renewal) | $16.00 |
| Route 53 hosted zone: $0.50 × 12 | $6.00 |
| Certificate (Let's Encrypt) | $0.00 |
| **Total, before tax** | **$22.00** |

On the conversion basis above, that is 30,800 KRW per year before tax and 33,880 KRW after tax, and divided by month, about $1.83. DNS query charges are $0.40 per million queries, so at personal-app usage I did not include them in the total.

### Storage assumption

- Images stay on the server disk (Lightsail base SSD), with only the current and previous version per app, so there is no separate cost. Disk usage is included in the snapshot size.
- The 20 GB-month for snapshots is an assumption about the total billable data being kept. It is not the cost of keeping 20 GB every day without limit.
- If this value grows, the cost grows too. Once the actual retained amount is confirmed, recalculate this table.

## 3. Per-app allocation basis

Shared costs are not billed separately, so this is a **management allocation** to see how much each app uses.

| Cost item | Allocation basis | Reason |
|---|---|---|
| Lightsail server | Split equally by the number of running apps | Per-app memory and CPU usage have not been measured yet. All are personal apps with few concurrent users, so the difference is assumed to be small |
| Lightsail snapshot | Split equally by the number of running apps | A snapshot captures the whole server at once, so it cannot be split by app |

- A **running app** is an app that is deployed on the server and actually running. An app not yet deployed counts as 0.
- If you measure per-app memory usage, you can change the server cost to be proportional to memory. If you change it, fix this section and the chapter 4 table together.
- The calculation fixes the server total first and then divides. Because of rounding to the won, the sum of the per-app amounts can differ from the total by 1–4 KRW.

## 4. Per-app allocation table

### When all 8 apps are running (equal split, 1/8 per app)

| Slot | App | Phase | 2 GB pre-tax USD | 2 GB after-tax won | 4 GB pre-tax USD | 4 GB after-tax won |
|---|---|---|---:|---:|---:|---:|
| 01 | workout-memo | 1 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 02 | study-log | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 03 | health-log | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 04 | life-journal | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 05 | money-ledger | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 06 | cert-manager | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 07 | plan-routine | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| 08 | dev-career-portfolio | 2 | $1.63 | 2,503 KRW | $3.13 | 4,813 KRW |
| | **Total** | | **$13.00** | **20,020 KRW** | **$25.00** | **38,500 KRW** |

The basis for the per-app amounts is as follows.

| Item | 2 GB per app | 4 GB per app |
|---|---:|---:|
| Lightsail: total ÷ 8 | $12.00 ÷ 8 = $1.50 | $24.00 ÷ 8 = $3.00 |
| Snapshot: $1.00 ÷ 8 | $0.125 | $0.125 |
| **Total per app** | **$1.625** | **$3.125** |

The after-tax won is $1.625 × 1,400 × 1.10 = 2,502.5 KRW and $3.125 × 1,400 × 1.10 = 4,812.5 KRW, rounded.

### Per-app amount by number of running apps

The phase 2 apps are deployed one after another. In between, divide by the number of running apps (N). The server size stays the same, so the total does not change and only the per-app amount changes.

| Running apps N | 2 GB per-app pre-tax USD | 4 GB per-app pre-tax USD |
|---:|---:|---:|
| 1 (workout-memo only) | $13.00 | $25.00 |
| 2 | $6.50 | $12.50 |
| 4 | $3.25 | $6.25 |
| 8 | $1.63 | $3.13 |

## 5. Missing costs

These items are not in the example total. If you start using any one of them, recalculate the chapter 2 table.

- Domain and DNS (the "Domain" table in chapter 2), a separate managed DB (RDS), a load balancer, a NAT Gateway, extra disks
- Paid CloudWatch logs, paid support, traffic over the included amount
- A paid VPN (apps without login assume SSH tunnels or private access)

Merely stopping the instance does not remove all fixed costs. The remaining snapshots and images also incur cost (see the cleanup procedure in the [deploy template](runbooks/deploy.md)). A budget alert is not a feature that blocks spending; it only sends a notification.

## 6. When choosing a different setup

| Setup | Cost basis | Allocation |
|---|---|---|
| Separate app server and managed DB (RDS PostgreSQL) | The user's initial budget of 30,000–60,000 KRW or more per month. This is not a firm quote. Recalculate by adding the DB instance type, Single-AZ/Multi-AZ, storage, backup, IPv4, transfer, and the app server cost | Split the DB cost equally by the number of running apps too, and once you measure per-app DB size, change it to be proportional to storage |
| Build images in CI and pull them from a registry (ECR) | ECR storage $0.10/GB-month. With 5 GB-month of images for 8 apps, $0.50 | Proportional to per-app storage, and equal split until measured |
| Static frontend hosting (Amplify and others) | Charges for build, storage, transfer, and SSR requests and compute. The API and DB need a separate runtime. Even at low traffic, do not assume it is all free | Hosting cost is billed per app, so attach it directly to that app |

## 7. Official sources

Checked on 2026-10-15. Prices can change, so check again when you change the setup.

- [Lightsail pricing](https://aws.amazon.com/lightsail/pricing/): Linux public IPv4 base price $5/$7/$12/$24, snapshot $0.05/GB-month
- [Route 53 pricing](https://aws.amazon.com/route53/pricing/) (checked 2026-11-01): hosted zone $0.50 per month, standard queries $0.40 per million. The `.com` $16 is the value from [Classmethod](https://dev.classmethod.jp/en/articles/route53-tld-pricing-change-2026/) and [CostGoat](https://costgoat.com/pricing/route-53-domains), which cite the AWS price list; check again on the purchase screen
- [ECR pricing](https://aws.amazon.com/ecr/pricing/): storage $0.10/GB-month
- [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/): billing items by setup. The Seoul region quote is not finalized
- [Amplify pricing](https://aws.amazon.com/amplify/pricing/): billing items for build, storage, transfer, and SSR requests and compute. The quote for 8-app usage is not finalized
