# #143 Update external Actions to the latest Node 24 versions

## Change

| File | Content |
|---|---|
| `versions.json` | Updated 4 Actions to commit SHAs of Node 24 (`runs.using: node24`) versions. Added the runner pin `runner: "ubuntu-24.04"` |
| `versions.schema.json` | Added `runner` (required, `ubuntu-<version>` format) |
| 6 files in `.github/workflows/*.yml` | New SHAs and version comments, `runs-on: ubuntu-24.04`. `package-manager-cache: false` on the setup-node steps other than the app CI |
| `scripts/check-workflows.mjs` | Checks that every `runs-on:` equals `runner` in `versions.json` |
| `scripts/test/workflows.test.mjs` | Changed to read version strings from `versions.json`. Added a test for the `runs-on` check |

| Action | Before | After | Release date | Commit SHA |
|---|---|---|---|---|
| `actions/checkout` | v4.4.0 | v7.0.1 | 2026-07-20 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | v4.4.0 | v7.1.0 | 2026-10-08 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| `actions/upload-artifact` | v4.6.2 | v7.0.2 | 2026-10-07 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |
| `hashicorp/setup-terraform` | v3.1.2 | v4.0.1 | 2026-05-12 | `dfe3c3f87815947d99a8997f908cb6525fc44e9e` |

- Each version is the newest released before 2026-10-08 (14 days ago). We confirmed each SHA with the `git/ref/tags/<tag>` API (all 4 are lightweight tags). We also confirmed that the `action.yml` at each SHA is `node24`.
- The `ci.yml` in app repos calls the central common CI by commit SHA, so after the merge the sync PR changes it together as it points to the new commit. There is nothing to fix in the template file itself.

## Major change review (official release notes)

| Action | Major | Impact |
|---|---|---|
| checkout | v5: Node 24, runner v2.327.1 or later | No impact, since we use GitHub-hosted runners |
| checkout | v6: credentials are stored in a separate file instead of `.git/config` | Central scripts commit through the API and do not use `git push`. No impact |
| checkout | v7: blocks checking out fork PRs in `pull_request_target` and `workflow_run`, switch to ESM | We use neither trigger. No impact |
| setup-node | v5: automatic cache when `packageManager` exists. v6: limits automatic cache to npm, removes `always-auth` | The central repo has `packageManager` but no lockfile, so the automatic cache fails. So we added `package-manager-cache: false`. The infrastructure CI also does not run `npm ci`, so we turn it off there too. The app CI states `cache: npm` explicitly, so we leave it. We do not use `always-auth` |
| setup-node | v7: removes the fake `NODE_AUTH_TOKEN` that was set when `registry-url` was given | `publish.yml` passes `NODE_AUTH_TOKEN` directly in the publish step, and the app CI sets it in the workflow-wide `env`. No impact |
| upload-artifact | v5 and v6: Node 24. v7: adds direct upload with `archive: false`, ESM | No change to the inputs (`name`, `path`, `retention-days`) |
| setup-terraform | v4: Node 24 | No change to the inputs (`terraform_version`) |

Sources: GitHub Releases of each repo (`actions/checkout`, `actions/setup-node`, `actions/upload-artifact`, `hashicorp/setup-terraform`) and the Breaking changes section of the `actions/setup-node` v7.1.0 README.

## Decisions

- We pin the runner to `ubuntu-24.04` instead of `ubuntu-latest`. `ubuntu-latest` changes to Ubuntu 26 from 2026-10-19, and we do not want an image change mixed with the Action update. 24.04 is the image CI has been passing on so far. When we move to the next image, changing only `runner` in `versions.json` makes `check-workflows` report the places that were missed.
- We chose v7.1.0 for setup-node. Its release date (2026-10-08 02:52 UTC) equals the 14-day cutoff day. At the time the issue was written it was recorded as not yet 14 days old, so we get the user's confirmation in the PR. Switching to v7.0.0 (`820762786026740c76f36085b0efc47a31fe5020`) needs no other change.

## Verification

- `npm run check` passed (166 of 167 tests passed, 0 failed, 1 skipped. `check-workflows: ok (8 files)`).
- Ran `npm run docs`: no change to the generated docs.
- Not done: running real GitHub Actions. The central CI runs on this PR, and the common CI for apps and infrastructure runs for the first time in the sync PR after the merge.
