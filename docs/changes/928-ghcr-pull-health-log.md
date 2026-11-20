# GHCR rollout: health-log pulls images (#928)

- `registry/projects.json`: health-log gets `ghcr.pull: true` (push was on since #920; packages health-backend and health-frontend are Private, checked by API on 2026-11-21).
- `scripts/test/deploy-pull.test.mjs`: the guard expects health-log in the pulling list.
- After the sync PR merges and the deploy runs, check the journal line "pulled <sha12> from ghcr.io/sirloinbh", deployed = main, health 200, no `.autodeploy-failed`. Results are on #928.
