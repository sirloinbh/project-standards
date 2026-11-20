# GHCR rollout: money-ledger pulls images (#928)

- `registry/projects.json`: money-ledger gets `ghcr.pull: true` (push was on since #920; packages money-backend and money-frontend are Private, checked by API on 2026-11-21).
- `scripts/test/deploy-pull.test.mjs`: the guard expects money-ledger in the pulling list.
- After the sync PR merges and the deploy runs, check the journal line "pulled <sha12> from ghcr.io/sirloinbh", deployed = main, health 200, no `.autodeploy-failed`. Results are on #928.
