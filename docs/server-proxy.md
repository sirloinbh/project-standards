# Server reverse proxy and HTTPS

One nginx on the Lightsail server takes 443 for all 8 apps and forwards each subdomain to that app's web port on `127.0.0.1`. One Let's Encrypt wildcard certificate (`*.<root domain>`) covers every app, and certbot renews it through Route 53 DNS validation, so port 80 never has to be open to everyone ([ADR-0012](adr/0012-shared-domain-subdomains.md), #251).

The config is generated from the registry, so nothing is edited by hand on the server. Until the app template switch (#254) is done, the apps still answer on their own web ports as before ([ADR-0009](adr/0009-multi-app-single-lightsail.md)).

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

1. On the PC, generate the files and copy them to the server.
   ```powershell
   node scripts/proxy-config.mjs
   ssh -i ~/.ssh/<key> ubuntu@<static_ip> "sudo install -d -m 755 /opt/project-standards/proxy/nginx"
   scp -i ~/.ssh/<key> -r .local/proxy/* ubuntu@<static_ip>:/tmp/proxy/
   ssh -i ~/.ssh/<key> ubuntu@<static_ip> "sudo cp -r /tmp/proxy/. /opt/project-standards/proxy/ && rm -rf /tmp/proxy"
   ```
2. On the server, add the three keys above to `/opt/project-standards/.env`.
3. Check that nothing else listens on 80 or 443: `sudo ss -ltnp '( sport = :80 or sport = :443 )'` shows nothing.
4. Issue the certificate, then start nginx (nginx cannot start before the certificate exists).
   ```bash
   cd /opt/project-standards/proxy
   sudo bash cert.sh issue
   sudo docker compose up -d nginx
   sudo bash cert.sh install       # renewal timer
   ```
5. Check from an allowed IP: `curl -I https://<app>.<root domain>` returns the app's response for each app, and `sudo bash cert.sh dry-run` ends with "Congratulations, all simulated renewals succeeded". Post the results on #253.

## Changes later

- **App added or web port changed:** regenerate, copy `nginx/apps.conf` to the server as in step 1, then `sudo bash cert.sh reload` (it runs `nginx -t` first and does not reload a broken config).
- **Image version changed in `versions.json`:** regenerate and copy `compose.yaml`, then `sudo docker compose pull nginx && sudo docker compose up -d nginx`.
- **Renewal check:** `systemctl list-timers cert-renew.timer`, `journalctl -u cert-renew.service --since -2d`.

## Limits

- If the proxy or the certificate breaks, all 8 subdomains break together. Until #254 closes the web ports, `http://<static_ip>:<WEB_PORT>` still works as a fallback.
- Behind the proxy, every request reaches the app's nginx from `127.0.0.1`, so the per-IP API rate limit (10 per second, burst 40) is shared by all clients of that app until #254 adds a `real_ip` setting. With one user per app this does not matter.
