# #770 Mount the migrations where the image's runner looks

The managed `backend/Dockerfile` now ends with `WORKDIR /app/backend`, so the runner in `dist/standard/migrate.js` reads `/app/database/migrations/`. The deploy migrate step still mounted them at `/database/migrations`, so workout-memo's first deploy (cbe1ba3) failed with `ENOENT scandir '/app/database/migrations/'` and rolled back.

## Change

- `templates/deploy/deploy/remote-deploy.sh.tmpl`: the `migrate: step` branch (apps) mounts at `/app/database/migrations`. Services use `migrate: image` (their own single-package image runs the migrations at start), so this branch never runs for them and their layout is unchanged.
- `templates/app/backend/src/standard/migrate.ts.tmpl`: the comment names the real image path.
- `scripts/test/deploy-migrations-mount.test.mjs`: for every app, resolves the runner's lookup path from the final `WORKDIR` and the relative URL in `migrate.ts` and requires it to equal the mount target; for services it checks the step is gated on `migrate=step`.

Other references checked: `scripts/ci-migrate.sh` and the CI workflow run on the host checkout; compose files do not mount migrations; docs only mention the repo path.
