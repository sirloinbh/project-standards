# #71 CI workflows (central CI, common app and infra CI)

## Change

| File | Content |
|---|---|
| `.github/workflows/ci.yml` | Central repo verification: `npm run check` (tests, registry, generated files, package rules, workflow check) and `ioc-scan`. It has no external dependencies, so `npm ci` is not needed |
| `.github/workflows/reusable-app-ci.yml` | Common app CI. It runs in this order: supply chain check, `npm ci --ignore-scripts`, central standards check, post-install supply chain check, DB migration, `npm run check`. It also has e2e (optional) and a Docker build (package auth with a BuildKit secret) |
| `.github/workflows/reusable-infra-ci.yml` | Common infrastructure CI: central standards check, supply chain check, `terraform fmt -check`, `init -backend=false`, `validate`, and `bash -n` on shell scripts. It does not apply |
| `templates/app/.github/workflows/ci.yml.tmpl`, `templates/infra/...` | The caller in downstream repos. It pins the central workflow to the central commit SHA being synced and passes the registry and versions values |
| `scripts/lib/vars.mjs`, `sync-plan.mjs` | Added `central.sha` to the template variables |
| `versions.json` | Terraform CLI `1.16.5`. It was released on 2026-10-02 and is the newest version that is past the 14-day rule. 1.16.6 and 1.17.0 are not 14 days old yet |
| `scripts/check-workflows.mjs` | Added a rule forbidding `${{ }}` inside `run:` scripts (security fix below) |
| `scripts/test/` | Caller rendering, a script injection check test, and a snapshot update (1 `ci.yml` added per target) |

## Security fix: script injection in publish.yml

- **Problem:** The automated security review found a script injection risk in `publish.yml`, which was merged in the previous PR (#70). It put `${{ github.ref_name }}` (the tag name) directly into a `run:` shell. A Git tag name can contain characters such as `'`, `$`, and `;`, so a command could be run through a tag name.
- **Fix:**
  - The tag value is passed only through `env: TAG`.
  - The first step checks that it matches `^[a-z][a-z0-9-]*/v\d+\.\d+\.\d+$`. This check runs before checkout.
  - The package name, version, and run URL are also passed as environment variables.
  - `inputs.npm-version` in the common CI was changed the same way.
- **Preventing recurrence:** `check-workflows` fails on any `${{ }}` inside a `run:` script.

## Checks

- `npm run check`: 99 tests passed, `check-workflows: ok (6 files)`. The 6 are 4 central workflows and 2 templates.
- A real CI run in downstream repos will be verified at the first sync (#97). For downstream repos to call this workflow, a user step (allowing Actions access in #86) is needed first.
- actionlint is not installed.
