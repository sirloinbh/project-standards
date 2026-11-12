# #417 Stop autodeploy from halting deploys because of runs that GitHub starts itself

## Problem

`ci_state` in `autodeploy.sh` deployed only when **all** check runs attached to the main commit succeeded. In workout-memo, deploys halted twice on 2026-11-08.

- `254e1f7`: A Dependabot security update run (`npm_and_yarn in /. for minimatch - Update`) failed, because no fixed version exists yet.
- `593a906`: A CodeQL default setup run failed with a 504 while downloading the CLI. A default setup run cannot be re-run.

In both cases our own `ci` workflow (verify, docker-build, e2e-visual) and `windows-auth` passed.

## What was checked

- The `app.slug == "dependabot"` filter proposed in the issue body does not work. In the real response, the `app.slug` of a Dependabot check run is also `github-actions`.
- In the workflow runs API (`/actions/runs?head_sha=`), both the Dependabot update and the CodeQL default setup have `event: "dynamic"` and a `path` of `dynamic/...`. Repo workflows have real events such as `push`.

## Change

| File | Content |
|---|---|
| `templates/app/deploy/autodeploy.sh.tmpl` | Reads the workflow runs API instead of check-runs, and deploys if everything except runs whose `event` is `dynamic` is success, skipped, or neutral |
| `scripts/test/deploy-templates.test.mjs` | Changed the input to `workflow_runs` and added cases for a failed dynamic run, an in-progress run, and only dynamic runs |
| `docs/runbooks/deploy.md` | Wrote the exclusion of dynamic runs in the description of the deploy conditions |

This gives the same result as the proposal in the issue comment (narrowing the deploy decision to repo workflows). The approach of reading the required checks list from branch protection was not used because it needs authentication (the server uses only the public API). CodeQL alerts are viewed separately in code scanning.

## Checks

- The local Windows machine has no python3, so that test is skipped (it runs on ubuntu in CI). So I ran `ci-state` of the script rendered in WSL Ubuntu directly: the pending, pass, and fail decisions and 7 dynamic-run cases all came out as expected, and the workflow runs responses for workout-memo's real commits `254e1f7` and `593a906` were both `pass` (before the change they were `fail`).
- `npm run check`: the result is written in the PR body.
- Rollout: the sync PR changes `deploy/autodeploy.sh` in each app. For workout-memo, if `.autodeploy-failed` remains after the sync PR is merged, it is judged again at the next main commit (if `593a906` is currently recorded, you can retry right away with `rm /opt/workout-memo/.autodeploy-failed`).
