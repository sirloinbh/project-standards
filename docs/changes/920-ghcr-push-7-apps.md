# GHCR rollout step 3a: the 7 apps push images (#920)

- `registry/projects.json`: study-log, health-log, life-journal, money-ledger, cert-manager, plan-routine and dev-career-portfolio get `ghcr.push: true`. Pull stays off for them until their packages are Private (user step), then one app at a time.
- `scripts/test/deploy-pull.test.mjs`: the guard expects every app and service to push; the per-project switch test removes health-log switch so it still shows the off state.
- Expected packages (14): study-backend/-frontend, health-backend/-frontend, journal-backend/-frontend, money-backend/-frontend, cert-backend/-frontend, plan-backend/-frontend, career-backend/-frontend (checked by API after the first pushes).
