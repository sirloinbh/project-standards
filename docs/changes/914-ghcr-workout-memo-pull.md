# GHCR rollout step 2: workout-memo pulls images (#914)

- `registry/projects.json`: workout-memo gets `ghcr.pull: true` (push was already on; packages workout-backend and workout-frontend must be Private, user step).
- `scripts/test/deploy-pull.test.mjs`: the guard expects shared-ai and workout-memo to pull.
- After the sync PR merges and the deploy runs, check the journal line "pulled <sha12> from ghcr.io/sirloinbh" and health.
