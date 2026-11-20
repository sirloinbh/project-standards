# GHCR rollout: cert-manager pulls images (#928)

- `registry/projects.json`: cert-manager gets `ghcr.pull: true` (push was on since #920; packages cert-backend and cert-frontend are Private, checked by API on 2026-11-21).
- `scripts/test/deploy-pull.test.mjs`: the guard expects cert-manager in the pulling list.
- After the sync PR merges and the deploy runs, check the journal line "pulled <sha12> from ghcr.io/sirloinbh", deployed = main, health 200, no `.autodeploy-failed`. Results are on #928.
