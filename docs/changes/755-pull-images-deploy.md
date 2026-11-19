# 755: remote-deploy.sh can pull the CI images instead of building them, off by default

Server half of [ADR-0023](../adr/0023-build-images-in-ci-pull-from-ghcr.md); the CI half is #754 (merged, also off). Nothing changes in production: `project.deploy.pull` is `off` for every app and service, so the rendered scripts still build on the server.

## What changed

- **`templates/deploy/deploy/remote-deploy.sh.tmpl`** (the one script for apps and services, #696)
  - New `pull_images <tag>`: logs in to `ghcr.io` with the server `.env` token (`NODE_AUTH_TOKEN`, `read:packages`, already exported for the build) on standard input, pulls `ghcr.io/sirloinbh/<image>:<tag>` for each image of the project and tags it with the local name `<image>:<tag>` that `compose.yaml` uses. `docker compose up` then finds the images and builds nothing. Any failure (no token, login, a missing image) returns non-zero.
  - `deploy`: when pulling is on and `pull_images` succeeds it skips the build; otherwise it builds as before, so an app can move before its first image is pushed.
  - `rollback [tag]`: without a tag it is the previous image from the local cache, as before (works with GHCR down). With a tag it starts any earlier commit tag, pulling it first when pulling is on, and falls back to a local image if the pull fails.
- **`scripts/lib/vars.mjs`**: `project.deploy.pull` (`off`), `registry` (`ghcr.io/sirloinbh`) and `registryUser`.
- **Tests**: `scripts/test/deploy-pull.test.mjs`: the switch is off in every rendered script, the fallback path, the rollback tag, and `pull_images` run against a fake docker (token only on stdin, never an argument; login, pull and tag calls; failure paths).

## Turning it on

Not yet. Order: confirm the private-package quota (#756, user step) → turn `push-images` on for one app (#754) and watch a push → flip `pull` to `on` for that app only (a registry flag, added in that PR) → watch the first pull deploy → the rest. The first deploy of an app with pulling on is a production deploy: the user decides when each app moves, and the server rollback-by-tag test is a user step.

## Tests

`npm run check`.
