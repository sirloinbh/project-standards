# #1121 signals state directory writable by app timers

## Problem
`/var/lib/project-standards/signals` is created by `public-check.sh` (root) as `root:root 755`. App timers run as `ubuntu`, so `signals.sh record` fails for every app signal and autodeploy logs "could not record the deploy signal for the aws sink". Only `server.public` existed.

## Change
- `scripts/lib/signals.sh`: new `ensure_state_dir` (used by `record` and `evaluate`) creates the directory and sets `1777`; if the directory is not writable it prints the one-line fix instead of failing silently.
- `docs/server-proxy.md`: documents the mode and the one-time server step.
- `scripts/test/signals.test.mjs`: a new directory gets mode 1777 (skipped on Windows, runs in CI on Linux).

## Why 1777
Root and the app user both write signal files. The sticky bit stops one user replacing another's file. The files hold only `ok|fail <epoch>`; the server is single-tenant.

## Server step (user/coordinator, not run here)
1. Copy the regenerated `signals.sh` to `/opt/project-standards/proxy/`.
2. `sudo chmod 1777 /var/lib/project-standards/signals`.
3. Any signal file already owned by root (e.g. one written by a manual `sudo` run) must be removed once, or the app user cannot replace it: `sudo rm /var/lib/project-standards/signals/<app>.<check>`.
