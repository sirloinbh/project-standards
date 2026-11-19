# 757: per-project ghcr switches in the registry

The user decided (2026-11-19) to set a small Packages budget (about $5 a month) and move every app and service to CI-built images, 2 versions per image. This change builds everything up to the first real push; nothing is switched on.

- `registry/projects.schema.json`: optional `ghcr: { push, pull }` on every project and every shared service, both default to false when missing.
- `scripts/lib/vars.mjs`: `project.deploy.push` (`true`/`false`) and `project.deploy.pull` (`on`/`off`) come from those fields.
- Both `ci.yml` templates render `push-images: {{project.deploy.push}}`; `remote-deploy.sh` already renders the pull switch.
- Tests (`deploy-pull.test.mjs`): everything renders off by default; `ghcr.push` / `ghcr.pull` on one project change only that project; push alone does not turn pulling on.
- ADR-0023 records the decision and the price (about $0.24 per GB-month). How to turn a project on is in `docs/changes/757-service-ghcr-push.md`.
