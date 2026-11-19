# 757: the shared services can push their image to GHCR and deploy by pull, both off

Follows [ADR-0023](../adr/0023-build-images-in-ci-pull-from-ghcr.md) and [#754](754-ghcr-image-push.md) / [#755](755-pull-images-deploy.md) for the services. Nothing changes in production: the switch is off for shared-auth and shared-ai.

- **Pull side:** nothing new to build. The service profile already renders the same `remote-deploy.sh` as the apps (#696), with `project.deploy.pull` = `off` and `images` = `<service>-backend`, so a service pulls `ghcr.io/sirloinbh/<service>-backend:<sha12>` and falls back to the local build when the pull fails or there is no token (#755).
- **Push side:** `reusable-service-ci.yml` gets the inputs `push-images` (default false), `image-prefix` and `image-keep` (default 5), and the job `image-push`: only on a push to `main`, only after `docker-build` passed, `packages: write` for that job alone, the image tagged with the first 12 characters of the commit, a retention step that cannot fail the run. The top-level permissions become `contents: read`, `packages: read`.
- **Callers:** `templates/service/.github/workflows/ci.yml.tmpl` allows `packages: write` (GitHub rejects the workflow at start when a called job asks for more than the caller grants) and passes `push-images: false` and `image-prefix: 'ghcr.io/sirloinbh/{{project.name}}'`.
- **Test:** `scripts/test/image-push-ci.test.mjs` (the service cases).

## Turning it on, one project at a time (#757, after the Packages budget is set and #698 is in)

The switches are registry fields, default off, for apps and for the shared services:

```json
"ghcr": { "push": true, "pull": true }
```

1. Set `push` first. The next sync PR changes that project's `ci.yml` to `push-images: true`. After it merges, let one run on `main` finish and look at the package: it is created private, the retention step keeps 2 versions (it may need a personal token, see #754).
2. The server `.env` of that project needs `NODE_AUTH_TOKEN` with `read:packages` (one token for the whole server).
3. Set `pull` after the first image exists. The next deploy pulls and falls back to the build if anything is missing, so a wrong order only costs a build.

The first real push starts only after the coordinator confirms the budget is set and #698 is done. #757 stays open until one service has moved.
