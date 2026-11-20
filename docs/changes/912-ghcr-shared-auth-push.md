# GHCR rollout step 1: shared-auth pushes images (#912)

- `registry/projects.json`: shared-auth gets `ghcr.push: true` (pull stays off until its first image exists and is Private).
- `scripts/test/deploy-pull.test.mjs`: the guard expects workout-memo, shared-auth and shared-ai to push.
- Order (user decision 2026-11-20, #757): shared-auth, then workout-memo pull, then the other 7 apps; push first, pull after one image exists, verify the "pulled <sha> from ghcr.io/sirloinbh" line and health.
- User steps: set each new package Private after its first push (public repos make new packages public); `NODE_AUTH_TOKEN` was added to /opt/shared-auth/.env on the server (user OK).
