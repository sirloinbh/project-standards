# Cancel superseded pull request CI runs (#873)

Pushing again to a pull request branch started a full run while the older one kept going. The central `ci.yml` and the app, service and infra `ci.yml.tmpl` now have a `concurrency` group:

- group: `<workflow>-<ref>` for `pull_request` events, `<workflow>-<run id>` for everything else, so a run on `main` is alone in its group;
- `cancel-in-progress` is true only for `pull_request`.

Why `main` is excluded: autodeploy reads every workflow run of a commit and treats `cancelled` as a failure. Even without cancel-in-progress, a shared group would drop an older queued `main` run, so `main` runs use the run id in the group. The reason is also written in `docs/runbooks/deploy.md`.

`scripts/test/workflows.test.mjs` checks the group and the condition in all four files. Infra still triggers on every push (`on: [push, pull_request]`); a branch push is its own group and is not cancelled, only pull request runs are.

Verification: `node --test scripts/test/workflows.test.mjs`, `npm run check`.
