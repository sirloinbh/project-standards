# 854: Server memory after the other 7 apps (docs/costs.md)

Issue: #854 (parent #745)

## What changed

`docs/costs.md` has a new section, "Measured usage after the other 7 apps were deployed (2026-11-20, #745)": whole-server memory, swap, and disk before and after, the 29 running containers, the average cost of one app (about 52 MiB of available memory), and the idle memory per container.

## Why

The 2026-11-15 measurement (#564) covered only workout-memo and the proxy. The 7 apps are deployed now, so the document shows the real numbers.

## Verification

- `npm run check:docs`
- Numbers come from `free -m`, `df -h /`, and `docker stats --no-stream` on the server on 2026-11-20 (before health-log, after money-ledger).
