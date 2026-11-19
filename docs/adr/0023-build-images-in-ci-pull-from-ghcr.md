# 0023. Build images in CI and pull them from GHCR

- Status: Accepted (issue #700, parent #665; user decision relayed 2026-11-19: option B)
- Date: 2026-11-19
- Supersedes: the "Image build" row of [ADR-0009](0009-multi-app-single-lightsail.md).
- Comparison: [docs/changes/700-image-build-comparison.md](../changes/700-image-build-comparison.md).

## Context

- Every deploy builds the Docker images on the server (`docker compose build`), one app at a time under `/run/lock/apps-deploy.lock`. The build is the memory peak of the 1 GB Lightsail server and the reason for its 2 GB swap and the planned plan upgrades.
- CI already builds the same commit (`docker-build` job) but only checks that the build works; it pushes nothing.
- Rollback restarts the previous image from the local cache; a rollback further back needs a rebuild.

## Decision

1. CI builds each image once on pushes to `main` and pushes it to GHCR, tagged with the commit SHA. Pull requests still only build.
2. The server pulls the image for the commit and starts it (`docker compose pull` and `up -d`). It no longer builds. Autodeploy already waits for CI, so the image exists by then.
3. Rollback is a tag switch: the server pulls and starts an earlier commit tag. It keeps the previous image in the local cache as today, so the one-step rollback still works when GHCR is unreachable.
4. The server needs one `read:packages` token for `docker login ghcr.io`. The `npm_token` build secret is used in CI only. CI pushes with its own `GITHUB_TOKEN` (`packages: write` in the push job only).
5. A retention rule removes old tags (for example keep the last 5 per image).
6. While an app has no pushed image, its deploy falls back to the local build, so each app can move on its own.

## Risks

- **Unconfirmed private-package quota.** The storage and bandwidth allowance for private GHCR packages on the `sirloinbh` plan is not confirmed. A third-party source lists 500 MB of Packages storage on the Free plan, shared with Actions artifacts. 10 services with two images each can exceed that without a retention rule. The retention rule (point 5) is part of the first follow-up issue, and the quota is checked before the first app moves. If it does not cover the images, stop and revisit this ADR rather than keep going.
- A GHCR outage blocks a deploy (the previous image keeps running).
- Public repositories (inlined CI, #209) need the package visibility set deliberately.
- Build time and peak memory per app are not measured, so the gain in deploy time and the possible smaller server plan are expectations, not numbers.

## Consequences

- The server holds no build cache and has no build memory peak. This is the main lever for staying on a smaller plan.
- Production runs the image that CI built and tested for that commit.
- The first deploy of each app after the change is a production deploy. Merging is not applying: the agent opens the PRs and the user decides when each app moves. The server rollback test is a user step.

## Follow-up issues (under #665)

- Reusable CI pushes images to GHCR on `main` with a retention rule.
- `remote-deploy.sh` pulls instead of builds, with the local-build fallback.
- The same for the service deploys, after #696.
- Confirm the private-package quota (user step).

## Revisit when

- The quota or price of GHCR changes, or the images no longer fit the retention rule.
