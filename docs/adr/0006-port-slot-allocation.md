# 0006. Slot-number-based port allocation

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

- Until now, ports were picked ad hoc each time a project was created. As a result, workout-memo vite (not specified, default 5173) and health-log vite 5173 collide, and workout-memo e2e web 5174 and life-journal vite 5174 collide.
- The health-log vite (5183) in the requirements table differed from the actual config.
- DB ports (554xx) are inside the ephemeral port ranges of Windows (49152 and above) and Linux (32768–60999). On this PC, a printer program already uses 55536.
- The e2e ports exist only in workout-memo, so they could collide again when Playwright is added to the other apps.

## Decision

Each project gets a slot `n` (01–99), and its ports are `base value per kind + n`.

| Kind | Base | Range |
|---|---|---|
| web | 8100 | 8101–8199 |
| api | 3100 | 3101–3199 |
| e2eApi | 3200 | 3201–3299 |
| vite | 5200 | 5201–5299 |
| e2eWeb | 5300 | 5301–5399 |
| db | 15400 | 15401–15499 |

- Slots are given in the existing order, from workout-memo 01 to dev-career-portfolio 08. A new project gets the largest slot used so far + 1. Retired slots are not reused.
- The `reservedPorts` in `registry/platform.json` (3000, 4173, 5173, 5432, 8080) are not assigned. None of this list overlaps the official ports of the 99 slots (see docs/changes/1-design-doc.md for the verification result).
- Vite runs with `strictPort: true`, so if a port collides it fails immediately instead of moving to another port.
- The registry lists ports explicitly, and central CI checks that they match the formula.

## Consequences

- Up to 99 projects never collide with each other. The last two digits of a port number tell you which project it belongs to.
- The ports of all 8 apps change. Each app repo must update compose, vite, playwright, server defaults, nginx, Dockerfile, and the README and AGENTS docs, and the user must change the port in `DATABASE_URL` in the local `.env` by hand.
- The production server's exposed ports are decided by the server `.env` (`WEB_BIND`, `WEB_PORT`), so they are unaffected. The local port in the SSH tunnel example commands is changed in the docs.
