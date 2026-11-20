# GHCR rollout: plan-routine pulls images (#928)

- `registry/projects.json`: plan-routine gets `ghcr.pull: true` (push was on since #920; packages plan-backend and plan-frontend are Private, checked by API on 2026-11-21).
- `scripts/test/deploy-pull.test.mjs`: the guard expects plan-routine in the pulling list.
- After the sync PR merges and the deploy runs, check the journal line "pulled <sha12> from ghcr.io/sirloinbh", deployed = main, health 200, no `.autodeploy-failed`. Results are on #928.
