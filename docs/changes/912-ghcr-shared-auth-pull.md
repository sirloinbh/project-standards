# GHCR rollout step 1b: shared-auth pulls images (#912)

- `registry/projects.json`: shared-auth gets `ghcr.pull: true`; its package shared-auth-backend is Private (user, 2026-11-20) and the first image was pushed from main f368967.
- `scripts/test/deploy-pull.test.mjs`: the guard expects shared-ai, shared-auth and workout-memo to pull.
- After the sync PR merges: check the journal line "pulled <sha12> from ghcr.io/sirloinbh" and health.
