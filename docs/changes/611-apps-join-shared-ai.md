# #611 Apps join the shared-ai network

## Change

| File | Content |
|---|---|
| `templates/app/deploy/remote-deploy.sh.tmpl` | `ensure_networks`: when `compose.yaml` names the `shared-ai` network and it does not exist, create it before compose starts the containers (deploy, migration run, and rollback). An app without the network makes no docker call |
| `scaffold/app/compose.yaml`, `scaffold/app/.env.example` | A new app's API joins `shared-ai` with the alias `<app>-api` and gets `AI_TOOLS_PUBLIC_KEY`, tagged `@ssm=/sirloinbh/shared/ai-tools-public-key` |
| `docs/ai-tools.md` | How an existing app joins the network, and who creates it |
| `scripts/test/deploy-templates.test.mjs`, `scaffold.test.mjs` | The network is created only when compose uses it and only when missing; the start path order; the scaffold compose and key |

## Why

The tool hub in sirloinbh/shared-ai reads each app's `/internal/tools` at `http://<app>-api:<api port>` on the private network `shared-ai` (ADR-0017). Compose refuses to start a service whose external network is missing, so without `ensure_networks` an app that joins the network could not deploy before shared-ai is deployed. With it, the two can deploy in either order.

## Choices made without asking

- The network is external in every compose file and created by a deploy script, instead of owned by the shared-ai compose project (the shared-auth pattern). The shared-auth pattern would make every app deploy fail until shared-ai is deployed.
- The public key is a shared SSM parameter (`/sirloinbh/shared/ai-tools-public-key`, ADR-0014: a key several apps use), so each app's deploy reads it with no server step per app. It is tagged `@secret` because ADR-0014 requires that for `@ssm` keys, though it is a public key.
- Existing apps join in their own PRs (workout-memo first), because `compose.yaml` and `.env.example` are app-owned.

## Verification

- `node --test scripts/test/deploy-templates.test.mjs scripts/test/scaffold.test.mjs`: 42 pass.
- `npm run check` (Git Bash): 656 tests, 654 pass, 0 fail, 2 skipped; registry, docs, tokens, packages, workflows, ioc and secret scans pass.
