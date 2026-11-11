---
paths:
  - "sync.config.json"
  - "versions.json"
  - "packages/**"
  - ".github/workflows/**"
  - "scripts/sync.mjs"
  - "scripts/compliance.mjs"
  - "scripts/lib/sync-*.mjs"
  - "scripts/lib/compliance.mjs"
---

# Sync and deploy (project-standards)

- **Sync:** when the central main is merged, `sync.yml` opens or updates a sync PR (`chore/standards-sync-*`) in every repo with `rollout ≤ maxRollout`. It is skipped when the GitHub App variable (`SYNC_APP_ID`) is missing. `maxRollout` is raised only after user approval.
- **Shared packages:** released only by pushing a tag (`<package>/v<version>`, `publish.yml`). The tag push is a user step. After a release, the agent opens the PR that raises the package version in `versions.json`.
- **Compliance:** `compliance.yml` collects downstream repo status every day and opens a PR that updates `docs/compliance.md` and `docs/env-matrix.md`. It is skipped without the App variable.
- **App deploy:** for apps deployed on the server (now workout-memo), merging main is a production deploy (pull-based autodeploy on the server). The other 7 apps are not on the server yet. On the first deploy, the server's `/opt/<app>/.env` needs `NODE_AUTH_TOKEN` (read:packages) so the Docker build can fetch shared packages. The user merges downstream sync PRs.
