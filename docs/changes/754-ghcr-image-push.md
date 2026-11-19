# 754: push images to GHCR from the reusable CI on main, off by default

Implements the CI half of [ADR-0023](../adr/0023-build-images-in-ci-pull-from-ghcr.md). Nothing changes in production: the switch is off for every app, and the pull side (#755) is not built yet.

## What changed

- **`reusable-app-ci.yml`**
  - New inputs: `push-images` (boolean, default `false`), `image-prefix` (for example `ghcr.io/sirloinbh/workout`) and `image-keep` (number, default 2 since #756: the current and the previous version).
  - New job `image-push`: runs only on a push to `main`, only when `push-images` is on, and only after `docker-build` passed. It logs in to GHCR with the run's `GITHUB_TOKEN` (stdin), builds `<prefix>-frontend` and `<prefix>-backend` from the same contexts as `docker-build` (the `npm_token` BuildKit secret as before), tags them with the first 12 characters of the commit (the tag the server deploy uses) and pushes them. The `org.opencontainers.image.source` label links each package to its repository.
  - `packages: write` is granted to this job alone. The top-level permissions stay read-only.
  - Retention: a second step lists the versions of each image through the REST API, keeps the newest `image-keep` and deletes the rest. It has `continue-on-error`, so a retention problem never fails a run.
- **`templates/app/.github/workflows/ci.yml.tmpl`**: the caller now allows `packages: write` (GitHub rejects the whole workflow at start when a called job asks for more than the caller grants), and passes `push-images: false` and `image-prefix`. Public apps (inlined CI, #209) get the same job with the condition switched off.
- **Test**: `scripts/test/image-push-ci.test.mjs`.

## Not verified (needs the real thing)

- The `GITHUB_TOKEN` may not be allowed to delete package versions under `/users/<owner>/packages/...`; if the retention step fails, a personal token or the package settings are needed. This surfaces only when the switch is on.
- The private-package quota is unconfirmed (#756). Turn the switch on for one app, after #756, and watch the first run.

## Turning it on (later, per app)

Set `push-images: true` in the app's `ci.yml` source (a registry feature flag is added when the first app moves). The first push of each image creates a private package; the pull deploy (#755) then reads it with a `read:packages` token.

## Tests

`npm run check`, including the sync snapshot (every app's `ci.yml` changes by the permission and two `with:` lines).
