# Server reverse proxy and HTTPS

One nginx on the Lightsail server takes 443 for all 8 apps and the shared services (registry `sharedServices`: the sign-in `auth`, [ADR-0015](adr/0015-shared-sign-in.md), and the AI service `ai`, [ADR-0017](adr/0017-ai-service-mcp-and-shell.md)) and forwards each subdomain to that app's web port on `127.0.0.1`. One Let's Encrypt wildcard certificate (`*.<root domain>`) covers every app, and certbot renews it through Route 53 DNS validation, so port 80 never has to be open to everyone ([ADR-0012](adr/0012-shared-domain-subdomains.md), #251).

The config is generated from the registry, so nothing is edited by hand on the server. Each app publishes its web container only on `127.0.0.1:<ports.web>`, and its own nginx answers to its subdomain and takes the client IP from `X-Forwarded-For` (#254).

## What is generated

`node scripts/proxy-config.mjs` (or `npm run proxy`) writes these files to `.local/proxy/`. They go to `/opt/project-standards/proxy/` on the server.

| File | Content |
|---|---|
| `nginx/apps.conf` | One `server` block per active app: `server_name <name>.<root domain>`, `proxy_pass http://127.0.0.1:<ports.web>`, HSTS. An app with `service.apiTimeoutSec` in the registry also gets a `location /api/` with `proxy_read_timeout` and `proxy_send_timeout` of that many seconds (study-log: 300, #1114) and, with `service.apiBodyMb`, a `client_max_body_size` of that many MB (study-log: 21, #1117); the others keep nginx's defaults (60 s, 1 MB). An app with `service.publicOrigin` (money-ledger: port 8443, `POST /kakao/skill`, money-ledger#314) also gets its own `listen <port> ssl` server that passes exactly that path and method, with a 16k body limit, straight to `127.0.0.1:<ports.api>` (the app publishes its API on loopback only) and answers 404 for everything else; each such port also gets a `default_server` that rejects the TLS handshake of any other name. HTTP redirects app names to HTTPS. Any other name gets no response (80) or no TLS handshake (443) |
| `compose.yaml` | `nginx` (`versions.images.nginx`, host network) and `certbot` (`versions.images.certbot`, run only by `cert.sh`) |
| `cert.sh` | `issue`, `renew`, `dry-run`, `reload`, `install` |
| `cert-renew.service`, `cert-renew.timer` | Runs `cert.sh renew` at 03:17 and 15:17 Seoul time. certbot renews only when the certificate is within 30 days of expiry |

- The script refuses to run while `rootDomain` in `registry/platform.json` is `null` (#539). To look at the output before that, run `node scripts/proxy-config.mjs --domain example.com`.
- Access is still limited to allowed IPs by the Lightsail firewall (443 and 80 open to `allowed_cidrs` only, #252), so nginx has no allow list of its own. The one exception is a `service.publicOrigin` port (8443 for money-ledger, opened to everyone in shared-aws-infrastructure#118 and #129): anyone can reach it, so the generated block passes only the exact path and method and never the app's web port. Setting the field in the registry does not open the port; the firewall rule is separate.
- Security headers other than HSTS (`X-Content-Type-Options`, `Referrer-Policy`) come from each app's own nginx.

## Shared server `.env` keys

These go into the shared file `/opt/project-standards/.env` (ADR-0010). Write only the key names in docs; never write the values anywhere.

| Key | Where it is created | Description |
|---|---|---|
| `CERTBOT_AWS_ACCESS_KEY_ID`, `CERTBOT_AWS_SECRET_ACCESS_KEY` | [User] from the IAM key created in #252 | A key that can change records only in the domain's hosted zone. Secret value. `cert.sh` passes it to the certbot container as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` |
| `HEALTHCHECK_URL_CERT` | [User] from healthchecks.io | Ping URL for the renewal timer. Set the period to 12 hours and the grace to 1 day. If renewal or the nginx reload fails, a failure ping is sent; if the timer stops, pings stop. Either way an email arrives. Secret value |
| `HEALTHCHECK_URL_PUBLIC` | [User] from healthchecks.io | Ping URL of the server-wide `public` check (#1076, see "Public URL probe" below). Period 5 minutes, grace 10 minutes. Secret value |
| `SECRETS_AWS_ACCESS_KEY_ID`, `SECRETS_AWS_SECRET_ACCESS_KEY`, `SECRETS_AWS_REGION` | [User], already there for `ssm-get.sh` (ADR-0010) | The SSM read key pair. `public-check.sh` uses it only to read the operations token below. Secret values |
| `PUBLIC_CHECK_SERVER_IP` | [User] optional | The server's public address for the hourly DNS comparison. When empty, `public-check.sh` reads it from `checkip.amazonaws.com` |
| `PUBLIC_CHECK_RESOLVER`, `PUBLIC_CHECK_DIG` | [User] optional | The DNS server for the comparison (default `1.1.1.1`) and the name of the dig command (default `dig`) |
| `NOTIFY_SINK` | [User] optional | Where signals go: `healthchecks` (default), `aws` or `both` (#1091, see "AWS alert path" below). `notify.sh` also reads it from an app's own `.env` |
| `AWS_ALERT_ACCESS_KEY_ID`, `AWS_ALERT_SECRET_ACCESS_KEY`, `AWS_ALERT_TOPIC_ARN`, `AWS_ALERT_REGION`, `AWS_ALERT_NAMESPACE` | [User] from shared-aws-infrastructure#105 | The alert IAM user (secret values), the SNS topic, the region (default `ap-northeast-2`) and the metric namespace (default `ProjectStandards/Uptime`; it must equal the alarms' namespace) |

## Public URL probe (#1076)

The `health` timer of each app only calls `127.0.0.1:<web port>`, so DNS, the certificate and the host nginx are not checked. `public-check.sh` (generated with the other proxy files from the registry, so a new app is covered by regenerating them) fills that gap for every active app and shared service ([research](research/uptime-gaps.md), option A).

- **Every 5 minutes** (`public-check.timer`): `curl --resolve <host>:443:127.0.0.1 https://<host>/api/health` for each host: HTTP 200 within 10 seconds, through the real nginx, certificate, proxy and app. `--resolve` makes the request go to the server itself, so the firewall (which admits only `allowed_cidrs`) does not matter.
- **Once an hour** (the run in the first 5 minutes of the hour, or `public-check.sh full`): `dig +short <host> @1.1.1.1` must return the server address, and the served certificate must have at least 14 days left (`openssl x509 -checkend`), a second line behind the `cert` check. A missing `dig` or an unknown server address skips the DNS part and says so in the ping body; it never fails the check.
- **One signal** to `HEALTHCHECK_URL_PUBLIC`: ok with the host count, or fail with each failing host and the reason (no secret in the body). A missing URL sends nothing; a failed send never changes the result. The send is one function, `send_signal`; the target is chosen by `NOTIFY_SINK` (below).
- **Install and use** [User]: copy the files as in "First install", then `sudo bash public-check.sh install`, then `sudo bash public-check.sh full` once to see the result. `dnsutils` must be installed for `dig` (`sudo apt-get install -y dnsutils`).
- **To record after the first run** [User]: whether `--resolve ... 127.0.0.1` works on the server (it should: nginx listens on 443 on the host), and whether a direct probe through the public address (without `--resolve`) also works from the server. The firewall may not allow the server to reach its own public address, which is why the probe does not depend on it. Write the result on #1076.

## Operations token and uptime issues (#1077)

When a host fails the probe, `public-check.sh` opens one GitHub issue in `sirloinbh/project-standards` (`Uptime: <host> is down`, label `area/deploy`), comments `Still down: ...` once an hour while it lasts, and comments `Recovered` and closes the issue when the probe passes again. Without the token everything in this section is skipped silently.

- **One token for two features.** A fine-grained personal access token, stored in SSM at **`/sirloinbh/shared/github-ops-token`** (SecureString, `ap-northeast-2`, [ADR-0014](adr/0014-app-secrets-ssm-paths.md); the server key pair may already read `parameter/sirloinbh/shared/*`). Permissions: **Issues: write** on `sirloinbh/project-standards` and **Deployments: write** on the 8 app repos (#1087: `autodeploy.sh` reads the same parameter with `deploy/ssm-get.sh` after each successful deploy and writes a deployment record; see [deploy.md](runbooks/deploy.md#4-auto-deploy-from-main)). Nothing else, no other repository, and not a GitHub App token. Do not put it in any `.env`.
- **Per-host incident state** lives in `/var/lib/project-standards/public-check/<host>` (`<issue number> <last comment time> <probe|full>`). A `probe` incident (`/api/health` failed) is closed by the next 5-minute run; a `full` incident (DNS or certificate) only by the next hourly full run, because a quick run does not check those.
- **Never blocks the probe.** A missing key pair, a missing token, an SSM error or a GitHub error only skips the issue step (the last two print one line to stderr). The exit code and the signal are unchanged. The token goes to curl on standard input, never as an argument, and is never printed. A nothing-failing run with no open incident makes no SSM or GitHub call.
- **Store or rotate it** [User]: create the token on GitHub (fine-grained, expiry at most 1 year, the permissions above), then `node tools/app-secrets.mjs` or the console `put-parameter --name /sirloinbh/shared/github-ops-token --type SecureString --overwrite` (see [tools.md](tools.md#app-keys-in-ssm-toolsapp-secretsmjs)). The server reads it again on every run, so nothing needs a restart. Revoke the old token on GitHub after the next probe run works. Open incidents keep their issue numbers across a rotation. To stop the feature, delete the SSM parameter.
- **See it work** [User]: stop the app's web container for 5 minutes (or run `sudo bash public-check.sh quick` while a host is down). One issue opens; start it again and the next run closes it.

## AWS alert path (#1091)

The user chose AWS to judge the server signals (research addendum in [uptime-gaps.md](research/uptime-gaps.md)): no limit of 20 checks, no firewall change. `NOTIFY_SINK=healthchecks|aws|both` in the shared `.env` (or an app's own `.env`) switches every signal at once; the default `healthchecks` changes nothing. Run `both` for a few weeks, then retire healthchecks.io in a later issue.

- **`notify.sh`** (per app) and **`public-check.sh`** write the latest state of each signal with `signals.sh record <app> <check> ok|fail` into `/var/lib/project-standards/signals/`. The message text is not stored or sent. The directory is `1777` (world-writable, sticky, like `/tmp`) because the app timers run as an unprivileged user while `public-check.sh` runs as root; `signals.sh` sets this when it creates or finds the directory as its owner. An existing `root:root 755` directory must be fixed once on the server: `sudo chmod 1777 /var/lib/project-standards/signals` (#1121). A signal file is replaced only by the user that created it.
- **`signals.sh evaluate`** runs at the end of every `public-check.sh` run (every 5 minutes). It counts the failing signals: a last record of `fail`, or no record within the limit (health and public 15 minutes, deploy 30 minutes, backup and report 26 hours, restore 8 days: stale). It sends two CloudWatch metrics in one call, `HeartbeatOk` (always 1) and `FailingSignals`, and publishes to SNS once when the failing set changes (and once on recovery), with signal names only. A failed publish is retried on the next run.
- **No AWS CLI.** The requests are signed by curl itself (`--aws-sigv4`), and the key pair goes to curl on standard input, like the S3 upload in `backup.sh`.
- **The alarms** (in shared-aws-infrastructure#105): `HeartbeatOk` with missing data counted as breaching (dead server, stopped timer, network or revoked key), and `FailingSignals` above 0. The metric namespace must match `AWS_ALERT_NAMESPACE`.
- **Reusable helper.** `signals.sh call <service> <Field=value>...` sends one signed AWS query request (`monitoring`, `sns`, or `ses` on host `email`) with the same credentials, region and curl signing; a later SES mail sits next to `PutMetricData` and `Publish` without a second AWS path.
- **Check it** [User]: put the five `AWS_ALERT_*` keys in `/opt/project-standards/.env`, copy the regenerated proxy files (`signals.sh` is new), set `NOTIFY_SINK=both`, wait 5 minutes, and run `sudo bash /opt/project-standards/proxy/signals.sh status` and look at the metrics in CloudWatch. Stopping `public-check.timer` for 15 minutes should send the alarm email, and starting it again the OK email.

## First install [User] (#253)

Prerequisites: the domain is bought (#249), `rootDomain` is filled (#539), and the DNS records, 443 firewall rule, and certbot IAM key are applied (#252).

1. On the PC, generate the files and copy them to the server. Keep each `ssh` command on one line; a line break inside the quotes sends two broken commands.
   ```powershell
   node scripts/proxy-config.mjs
   $k = "~/.ssh/<key>"; $s = "ubuntu@$(server-ip)"
   ssh -i $k $s "mkdir -p /tmp/proxy"
   scp -i $k -r .local/proxy/* "${s}:/tmp/proxy/"
   ssh -i $k $s "sudo install -d -m 755 /opt/project-standards/proxy && sudo cp -r /tmp/proxy/. /opt/project-standards/proxy/ && rm -rf /tmp/proxy"
   ```
   Run the remaining steps in an `ssh -i $k $s` session on the server. Windows PowerShell 5.1 drops double quotes nested inside an `ssh` argument, so commands with quotes, `(`, or `|` break when sent from the PC.
2. On the server, add the three keys above to `/opt/project-standards/.env`.
3. Check that nothing else listens on 80 or 443: `sudo ss -ltnp '( sport = :80 or sport = :443 )'` shows only the header line. An app deployed before the proxy may publish its web container on `0.0.0.0:80` (`WEB_BIND=0.0.0.0`, `WEB_PORT=80` in its `.env`). Move it to its registry port, which the proxy forwards to (#253):
   ```bash
   cd /opt/<app>
   sudo cp .env .env.bak-proxy
   sudo sed -i '/^WEB_BIND=/d;/^WEB_PORT=/d' .env
   printf 'WEB_BIND=127.0.0.1\nWEB_PORT=<ports.web>\n' | sudo tee -a .env >/dev/null
   sudo IMAGE_TAG=$(cat .deployed) docker compose up -d --no-deps web
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<ports.web>/api/health   # 200
   ```
4. Issue the certificate, then start nginx (nginx cannot start before the certificate exists).
   ```bash
   cd /opt/project-standards/proxy
   sudo bash cert.sh issue
   sudo docker compose up -d nginx
   sudo bash cert.sh install       # renewal timer
   ```
5. Check from an allowed IP: `curl -I https://<app>.<root domain>` returns the app's response for each app, and `sudo bash cert.sh dry-run` ends with "Congratulations, all simulated renewals succeeded". An app that is not deployed on the server yet returns 502. First install results: #253.

## Changes later

- **App added or web port changed:** regenerate, copy `nginx/apps.conf` to the server as in step 1, then `sudo bash cert.sh reload` (it runs `nginx -t` first and does not reload a broken config). Copy `public-check.sh` too, so the new host is probed.
- **`service.publicOrigin` added or changed:** regenerate and copy `nginx/apps.conf` and run `sudo bash cert.sh reload`; nothing else. The compose file needs no change: nginx already uses the host network, so a new `listen` port opens by itself once the config is reloaded (the firewall rule must already allow it). The app's API container must be published on `127.0.0.1:<ports.api>`. Check from outside: `curl -i -X POST https://<app host>:<port><path>` reaches the API, and a `GET`, another path, or another name does not.
- **Image version changed in `versions.json`:** regenerate and copy `compose.yaml`, then `sudo docker compose pull nginx && sudo docker compose up -d nginx`.
- **Renewal check:** `systemctl list-timers cert-renew.timer`, `journalctl -u cert-renew.service --since -2d`.

## Limits

- A call longer than the proxy timeout is cut off even when the app's own nginx allows more (#1011, #1114). Likewise a body over the proxy's `client_max_body_size` (default 1 MB) gets a 413 before the app sees it. Set `service.apiTimeoutSec` for an app whose API has a long time budget (and `service.apiBodyMb` for one that takes uploads), regenerate, copy `nginx/apps.conf`, and run `sudo bash cert.sh reload`.

- If the proxy or the certificate breaks, all subdomains break together, sign-in included. The firewall never opened the app web ports, so the fallback is an SSH tunnel to the app's web port: `server-ssh -L <ports.web>:127.0.0.1:<ports.web>`, then `http://localhost:<ports.web>`.
- An app that has not synced #254 yet sees every request as coming from the proxy, so its per-IP API rate limit (10 per second, burst 40) is shared by all its clients. With one user per app this does not matter.
