# 700: build images on the server, or build in CI and pull from GHCR

Status: decided on 2026-11-19: the user chose **option B** (CI builds and pushes to GHCR, the server pulls; rollback is a tag switch). The decision is recorded in [ADR-0023](../adr/0023-build-images-in-ci-pull-from-ghcr.md), which supersedes the "Image build" row of [ADR-0009](../adr/0009-multi-app-single-lightsail.md). The private-package quota is still unconfirmed and is recorded there as a risk. No code or template change in this PR.

## Where things stand (2026-11-19)

- Every deploy builds the images on the server (`templates/app/deploy/remote-deploy.sh.tmpl`: `docker compose build`), one deploy at a time under `/run/lock/apps-deploy.lock` (ADR-0009). The same commit is built again in CI by the `docker-build` job, which only checks that the build works; it does not push anything.
- The server is still a 1 GB Lightsail instance with 2 GB of swap (measured 2026-11-15, `docs/costs.md`). The swap exists because the 1 GB plan builds the images (`shared-aws-infrastructure` `user-data.sh`: "2 GB swap: the 1 GB plan builds the Docker images on the server"). ADR-0009 plans the move to 2 GB ($12/month) before the second app, and `docs/costs.md` expects 4 GB ($24/month) may be needed.
- Rollback today starts the previous images from the server's local Docker cache (`remote-deploy.sh rollback`). Only the current and the previous image of each app are kept (`docker image rm` of the rest after a deploy). It does not rebuild.
- The server `.env` of each app holds `NODE_AUTH_TOKEN` (`read:packages`) so that `docker compose build` can fetch the shared `@sirloinbh/*` npm packages as a BuildKit secret.
- Not measured: the server build time and peak memory per app. Only one app runs on the server today, so no number from a real multi-app deploy exists. The comparison below says "not measured" where it depends on that.

## Comparison

Option A keeps building on the server (today). Option B builds once in CI, pushes to GHCR, and the server pulls and starts.

| | A: build on the server | B: CI builds and pushes, the server pulls |
|---|---|---|
| Cost | $0 for a registry (no ECR). The cost is indirect: the server plan must carry the build peak (swap now; 2 GB planned, 4 GB possible: $12 to $24/month) | GHCR container storage and bandwidth are documented as currently free, with a notice of at least one month before any change ([GitHub billing docs](https://docs.github.com/en/billing/concepts/product-billing/github-packages)). The allowance for **private** packages by plan is not confirmed here; a third-party source lists 500 MB of Packages storage on the Free plan, shared with Actions artifacts ([discussion](https://github.com/orgs/community/discussions/183054)). 10 services with two images each would exceed 500 MB without a retention rule. Verify the current quota before choosing B |
| Secrets | Each server `.env` needs `NODE_AUTH_TOKEN` (`read:packages`) for the build, and the build secret `npm_token` | CI pushes with its own `GITHUB_TOKEN` (`packages: write` in the push job only). The server still needs one `read:packages` token for `docker login ghcr.io` (the same kind it has now). The `npm_token` build secret is used in CI, not on the server |
| Rollback | Previous image from the local cache: one step back, no network. A rollback further than one version rebuilds | Any earlier commit tag can be pulled: a rollback is a tag switch. It depends on GHCR being reachable, so keep the previous image in the local cache as today |
| Deploy time | The build runs on 1 vCPU, one app at a time under the global lock, so 8 apps plus 2 services queue behind each other. Not measured | The server does `pull` and `up -d`: seconds to a minute for the image layers that changed. The lock is held for a much shorter time. Not measured |
| Server memory and disk | The build is the memory peak (the reason for the 2 GB swap) and fills the disk with build cache, which `docker builder prune` has to clear after each deploy | No build on the server: no swap pressure from builds, no builder cache, smaller disk growth. This is the main lever for staying on a smaller plan, but how much smaller is not measured |
| What runs in production | The image built on the server from the commit. CI tested the same commit, but not this image | The image CI built and tested for that commit (build once, deploy what was built) |
| Change needed | None | CI: a `build-and-push` job on pushes to `main` (pull requests still only build); image names and tags in the reusable workflow; a retention rule for old tags. Deploy: `remote-deploy.sh` pulls instead of builds; autodeploy already waits for CI to pass, so the image exists by then |
| Risks | The server build is a single point of slowness and memory failure for all apps | GHCR outage blocks a deploy (the previous image still runs); quota or retention mistakes; public repositories (inlined CI, #209) need the package visibility set deliberately; a one-time migration of every app and both services |

## Recommendation

Choose **B**, on one condition: confirm the private-package storage quota of the `sirloinbh` account and set a retention rule (for example the last 5 tags per image). B removes the build from the server, which is what drives the swap and the planned plan upgrades, and it makes a rollback a tag switch. If the quota does not cover the images, stay on **A** and revisit when the server plan is decided. Do not decide on B for deploy time alone; that number is not measured.

## If B is chosen

Open these issues under #665: (1) reusable CI pushes images to GHCR on `main` with a retention rule; (2) `remote-deploy.sh` pulls instead of builds, with a fallback to the local build while an app has no pushed image; (3) the same for the service deploys, after #696; (4) an ADR that supersedes the "Image build" row of ADR-0009. The first deploy of each app after the change is a production deploy: merging is not applying, so the agent opens the PRs and the user decides when each app moves.

## Tests

`npm run check:docs` (docs-only change); CI runs `npm run check`.
