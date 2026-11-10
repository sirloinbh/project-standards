# 0005. Promoting shared-aws-infrastructure to an independent source and the scope of its exceptions

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

- `shared-aws-infrastructure` is a Terraform repo, not a Node app. App packages, Node version files, and app CI do not fit.
- The current source is `workout-memo/infrastructure/`, pushed out to `shared-aws-infrastructure` with subtree push. In this state, if the central repo merges a sync PR directly into `shared-aws-infrastructure`, history diverges at the next subtree push.
- It is shared infrastructure by name but lives inside one app repo, so once the other 7 apps start using it, the ownership relationship becomes awkward.
- Terraform state is a local file and there is no remote backend.

## Decision

- Promote `shared-aws-infrastructure` to an independent source. Remove `infrastructure/`, the terraform CI job, and the `infrastructure` remote procedure from workout-memo (design.md 9.1).
- The user moves the local state. A backup is made outside the repo before the move. Introducing a remote backend is left as separate work.
- Sync distinguishes it with the `infra` profile.
  - Applied: Git conventions, issue and PR templates, `.editorconfig`, `.gitattributes`, the common part of `.gitignore`, the common part of `AGENTS.md`, common skills related to infrastructure, the security baseline, `standards-check`
  - Excluded: Plan A packages, Node and npm version files, directory and router rules, app CI
  - Dedicated checks: `terraform fmt -check`, `terraform validate`, `bash -n`
- Sync PRs do not touch `.tf`, `.tfvars`, `.sh`, or `.terraform.lock.hcl`. The PR body states explicitly that it does not trigger an apply.

## Consequences

- Infrastructure change history is gathered in one repo. Terraform leaves workout-memo's CI and dependencies.
- If the state file is lost during the promotion, tracking of Lightsail resources breaks. So first confirm that the subtree split result and the remote main are identical, make the state backup, and only then proceed.
- The AWS prefix in the registry is still `null`, so the cross-check between apps and infrastructure starts working once a value exists.
