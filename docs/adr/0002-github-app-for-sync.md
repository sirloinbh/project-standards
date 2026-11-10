# 0002. Use a GitHub App for sync authentication

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

The central workflow must create branches and open PRs in 9 sub-repos. `GITHUB_TOKEN` can only be used on its own repo. A personal PAT holds full permissions for the user account for a long time, so the damage is large if it leaks.

## Decision

- Create the GitHub App `project-standards-sync` and install it only on the target repos.
- Permissions: Contents write, Pull requests write, Metadata read, **Workflows write**, Administration read, Secrets read, Variables read, **Issues write**, Code scanning alerts read.
  - The Workflows permission is added to the 3 in the requirements (bootstrap-prompt). The sync targets include `.github/workflows/ci.yml`, and GitHub rejects pushes that change workflow files with a token that lacks this permission.
  - The Administration, Secrets, and Variables **read** permissions are used by the compliance report (#22, #82) to check that repo settings and secret and variable **names** match the standard. With these permissions, secret values cannot be read and settings cannot be changed (added 2026-10-22, #74).
  - The Code scanning alerts **read** permission is used by the compliance report to check the CodeQL default setup state (`code-scanning/default-setup`). The repos are public, so alert contents are already public, and settings cannot be changed (added 2026-10-27, #260).
  - The Issues **write** permission is used for issue label sync (#40). The sync creates or fixes the labels from `templates/common/labels.json` in the target repos. It does not delete labels and does not change issue bodies or comments (added 2026-10-22, #40).
- The private key is kept only in the central repo secret. An installation token valid for 1 hour is issued on every run. JWT signing is implemented with `node:crypto`, without an external Action.
- Creating the App, installing it, and rotating the key are done by the user.

## Consequences

- Token lifetime is short, and permissions are limited to the installed repos.
- The PR author shows as the App bot, so these PRs are distinguishable from PRs made by people.
- Because of the Issues write permission, a leaked App key could create or change issues in the target repos. It does not affect code or deployment, and key management is as described below.
- Because of the Workflows permission, a leaked App key could change workflows in the target repos. The key is kept only in the central secret, and the rotation procedure is documented. Branch protection on each sub-repo's main means nothing lands without the user's merge.
