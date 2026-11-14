# #253 Proxy runbook fixes from the first install

## Change

| File | Content |
|---|---|
| `docs/server-proxy.md` | Step 1 creates `/tmp/proxy` before `scp` and runs the rest in an SSH session (Windows PowerShell 5.1 drops nested double quotes). Step 3 moves an app off `0.0.0.0:80` to its registry port. Step 5 notes that undeployed apps return 502. The fallback in "Limits" is an SSH tunnel, not the web port |

## What happened in the first install (2026-11-15)

- The `ssh` commands broke when pasted across two lines, and `scp` had no `/tmp/proxy` to copy into.
- workout-memo published its web container on `0.0.0.0:80` (`WEB_BIND=0.0.0.0`, `WEB_PORT=80`), which blocked the proxy. It was moved to `127.0.0.1:8101`.
- After that, `https://workout-memo.daysofme.com` answered 200 with a Let's Encrypt wildcard certificate (expires 2027-02-13). The other 7 apps return 502 because they are not deployed on the server yet.

## Not in this change

- The app template default `WEB_BIND=0.0.0.0` in `docs/runbooks/deploy.md` is part of #254 (app template switch).

## Verification

- `npm run check`: recorded in the PR body
