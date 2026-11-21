# #959 Manage the shared services' Node versions and Dependabot config centrally

ADR-0029 gap G2, from the research in #950. `shared-auth` and `shared-ai` pinned `engines` and `packageManager` in `backend/package.json` by hand, while the managed `backend/.npmrc` sets `engine-strict=true`. A Node or npm bump in `versions.json` changed the Dockerfile and the CI input through sync but not `engines`, so `npm ci` would fail (`EBADENGINE`) in CI and in the image build until each repo was edited by hand.

## Change

| File | Content |
|---|---|
| `templates/index.json` | `fields.service`: `backend/package.json` gets `packageManager`, `engines.node`, `engines.npm` from `versions.json` |
| `sync.config.json` | `backend/package.json` joins the `service` profile's `neverTouchExcept`. It is written in fields mode only; the rest of the file stays the service's own |
| `templates/service/.nvmrc.tmpl`, `.node-version.tmpl` | The central Node version, for local `nvm`/`fnm` |
| `templates/service/.github/dependabot.yml` | Security updates only, grouped like the apps'; npm reads `/backend` |
| `scripts/test/service-node-versions.test.mjs` | The fields and files arrive; a Node bump reaches `engines`, the version files and the CI input together; only the managed fields change |
| `scripts/test/fixtures/sync-snapshot.json` | 4 new entries per service |
| `docs/adr/0029-*.md` | G2 done |

## What was decided

- The services' dependency versions stay their own (no `dependencyFields`): they share 2 or 3 packages with the apps.
- No `package.json` text changes in either service now: both already have `24.21.0` / `11.19.0` and 2-space formatting, so the first sync PR adds the three new files and the manifest entries only.

## After the merge

The sync run opens a PR in `shared-auth` and in `shared-ai`. Each merge deploys the service; they are merged one at a time with the deploy check (deployed commit = main, health 200, no `.autodeploy-failed`).

## Checks

- `node --test scripts/test/service-node-versions.test.mjs scripts/test/sync.test.mjs`: passed.
- `npm run check`: passed.
