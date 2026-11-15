# Server reverse proxy and HTTPS

One nginx on the Lightsail server takes 443 for all 8 apps and the shared sign-in (`auth`, registry `sharedServices`, [ADR-0015](adr/0015-shared-sign-in.md)) and forwards each subdomain to that app's web port on `127.0.0.1`. One Let's Encrypt wildcard certificate (`*.<root domain>`) covers every app, and certbot renews it through Route 53 DNS validation, so port 80 never has to be open to everyone ([ADR-0012](adr/0012-shared-domain-subdomains.md), #251).

The config is generated from the registry, so nothing is edited by hand on the server. Each app publishes its web container only on `127.0.0.1:<ports.web>`, and its own nginx answers to its subdomain and takes the client IP from `X-Forwarded-For` (#254).

## What is generated

`node scripts/proxy-config.mjs` (or `npm run proxy`) writes these files to `.local/proxy/`. They go to `/opt/project-standards/proxy/` on the server.

| File | Content |
|---|---|
| `nginx/apps.conf` | One `server` block per active app: `server_name <name>.<root domain>`, `proxy_pass http://127.0.0.1:<ports.web>`, HSTS. HTTP redirects app names to HTTPS. Any other name gets no response (80) or no TLS handshake (443) |
| `compose.yaml` | `nginx` (`versions.images.nginx`, host network) and `certbot` (`versions.images.certbot`, run only by `cert.sh`) |
| `cert.sh` | `issue`, `renew`, `dry-run`, `reload`, `install` |
| `cert-renew.service`, `cert-renew.timer` | Runs `cert.sh renew` at 03:17 and 15:17 Seoul time. certbot renews only when the certificate is within 30 days of expiry |

- The script refuses to run while `rootDomain` in `registry/platform.json` is `null` (#539). To look at the output before that, run `node scripts/proxy-config.mjs --domain example.com`.
- Access is still limited to allowed IPs by the Lightsail firewall (443 and 80 open to `allowed_cidrs` only, #252), so nginx has no allow list of its own.
- Security headers other than HSTS (`X-Content-Type-Options`, `Referrer-Policy`) come from each app's own nginx.

## Shared server `.env` keys

These go into the shared file `/opt/project-standards/.env` (ADR-0010). Write only the key names in docs; never write the values anywhere.

| Key | Where it is created | Description |
|---|---|---|
| `CERTBOT_AWS_ACCESS_KEY_ID`, `CERTBOT_AWS_SECRET_ACCESS_KEY` | [User] from the IAM key created in #252 | A key that can change records only in the domain's hosted zone. Secret value. `cert.sh` passes it to the certbot container as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` |
| `HEALTHCHECK_URL_CERT` | [User] from healthchecks.io | Ping URL for the renewal timer. Set the period to 12 hours and the grace to 1 day. If renewal or the nginx reload fails, a failure ping is sent; if the timer stops, pings stop. Either way an email arrives. Secret value |

## First install [User] (#253)

Prerequisites: the domain is bought (#249), `rootDomain` is filled (#539), and the DNS records, 443 firewall rule, and certbot IAM key are applied (#252).

1. On the PC, generate the files and copy them to the server. Keep each `ssh` command on one line; a line break inside the quotes sends two broken commands.
   ```powershell
   node scripts/proxy-config.mjs
   $k = "~/.ssh/<key>"; $s = "ubuntu@<static_ip>"
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

- **App added or web port changed:** regenerate, copy `nginx/apps.conf` to the server as in step 1, then `sudo bash cert.sh reload` (it runs `nginx -t` first and does not reload a broken config).
- **Image version changed in `versions.json`:** regenerate and copy `compose.yaml`, then `sudo docker compose pull nginx && sudo docker compose up -d nginx`.
- **Renewal check:** `systemctl list-timers cert-renew.timer`, `journalctl -u cert-renew.service --since -2d`.

## Limits

- If the proxy or the certificate breaks, all subdomains break together, sign-in included. The firewall never opened the app web ports, so the fallback is an SSH tunnel to the app's web port: `ssh -i ~/.ssh/<key> -L <ports.web>:127.0.0.1:<ports.web> ubuntu@<static_ip>`, then `http://localhost:<ports.web>`.
- An app that has not synced #254 yet sees every request as coming from the proxy, so its per-IP API rate limit (10 per second, burst 40) is shared by all its clients. With one user per app this does not matter.
