# #564 Record the server's running apps and memory use

## Change

| File | Content |
|---|---|
| `docs/costs.md` | Added "Measured usage (2026-11-15, #564)": the server is still 1 GB, only workout-memo and the shared proxy run, per-container and whole-server memory, disk, and the spec decision |

## What was decided

- The user rebooted the server on 2026-11-15 to load the new kernel (`7.0.0-1017-aws`, 0 pending updates afterwards) and then ran `docker ps`, `docker stats --no-stream`, `free -m`, and `df -h /`.
- workout-memo came back after the reboot: `/api/health` on `127.0.0.1:8101` returned `{"status":"ok"}`, and `workout-health` and `workout-autodeploy` exited with status 0.
- 1 GB cannot hold 8 apps (about 95 MiB each when idle, about 340 MiB for the OS and Docker). Move to 2 GB before the second app or the auth service, as ADR-0009 says; raise to 4 GB if available memory stays under about 300 MiB or swap is used during builds.

## Checks

- `npm run check` passed (579 tests: 574 passed, 5 skipped, 0 failed; registry, docs, tokens, package, workflow, and secret checks ok)
