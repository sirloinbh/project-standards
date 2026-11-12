# #115 Raise maxRollout to 3

The user approved this on 2026-10-26. The prerequisite issues #114 (update the 7 app lockfiles and merge the sync PRs), #93 (infrastructure repo cleanup), and #71 (CI workflow) are closed.

## Change

| File | Content |
|---|---|
| `sync.config.json` | `maxRollout` 2 → 3. When this PR is merged to main, `sync.yml` opens a sync PR in `shared-aws-infrastructure` |
| `scripts/test/sync.test.mjs` | Changed the expected value so the infrastructure repo is in the plan, and check that the plan has no Terraform or shell files (`*.tf`, `*.tfvars`, `*.sh`, `.terraform.lock.hcl`) |
| `AGENTS.md`, `README.md` | Updated the current-phase text to match `maxRollout` 3 |

## Decisions

- The infrastructure sync PR applies only the `infra` profile (common and infrastructure templates, `reusable-infra-ci.yml`) and does not touch `neverTouch` paths. No `terraform apply` happens (ADR-0005).
- The user merges the infrastructure sync PR. The agent reviews that no protected path changed and records it on #115.

## Verification

- `npm run check`: passed (412 of 413 tests passed, 1 skipped, 0 failed)
- `node scripts/sync.mjs --dry-run --target sirloinbh/shared-aws-infrastructure`: 24 files (`.claude` and `.codex` hooks and skills, `.github` templates and `ci.yml`, `.standards/`, editor settings, `skills/std-*`). No Terraform or shell files.
