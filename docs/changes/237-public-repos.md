# #237 Switch repos to public (clean up the company identity)

## Why

The GitHub Actions usage limit of the private repos was used up, so CI did not start (#236, "recent account payments have failed or your spending limit needs to be increased"). Public repos get the default runners for free, so we decided to make them public. Before that, we checked for anything that must not be exposed (2026-10-27).

## Checks

- Secrets: no tokens, AWS keys, private keys, committed `.env` files, Terraform state, DB backups, or server IPs in any commit of the 9 private repos. The IPs and account numbers in the infrastructure repo are example values only
- Workflows: all use GitHub-hosted runners, with no self-hosted runners and no `pull_request_target`
- Exposure risk: the global git config on this PC was the company account, so the initial setup commits made before the per-repo config still had the company email (1 in each of 7 apps, 2 in infrastructure, 24 in workout-memo). The central repo has no commits with the company email, but 2 documents contained the company GitHub account name.

## What was done

| Target | Content |
|---|---|
| 8 apps and `shared-aws-infrastructure` | Rewrote the author and committer with the company email and name to the personal noreply (`sirloinbh`) and force-pushed all branches and tags. File contents are unchanged (main tree diff 0). Kept a copy from before the rewrite as a backup |
| workout-memo | Same work. Turned on only the force-push permission of branch protection for a moment and restored it right away (required checks `verify` and `docker-build`, force push and deletion forbidden). Cancelled the per-branch CI runs caused by the re-push |
| Central docs | Removed the company account name from `docs/tools.md` and `docs/bootstrap-prompt.md` |
| Local | Reset the app copies to the new main and deleted the `<app>-126` work folders whose merge was finished |

## What remains

- The user cannot delete the internal PR references on GitHub (`refs/pull/*`). The old commits remain if someone fetches these references directly. They are not visible on the web. However, in 5 PRs of workout-memo (#2, 5, 7, 10, 11) the company email is visible in the Commits tab (the repo was already public). Removing it completely requires a request to GitHub support.
- The old commits of the central repo keep the document content that contains the company account name and the personal Gmail author (the user decided to fix only the current documents).
- To prevent this again, the personal git config must be applied first in each repo (`~/.gitconfig-personal`, docs/tools.md).
