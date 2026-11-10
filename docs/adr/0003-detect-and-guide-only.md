# 0003. Sub-repo edits are only detected and guided

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

A sub-repo can edit a centrally managed file. Automatically reverting that edit, or automatically creating a PR to the central repo, causes these problems:

- Merging to main in an app repo is a production deploy. An automatic revert commit could trigger an unintended deploy.
- Creating reverse automatic PRs would require giving sub-repos write access to the central repo.
- A machine cannot judge whether a sub-repo's edit is a mistake or a project-specific need.

## Decision

- `standards-check` in sub-repo CI detects violations and fails. The output contains the differing files, the central path, an example command for opening an issue or PR in the central repo, and how to register `allowedDifferences`.
- The check script is copied into each sub-repo (`.standards/check.mjs`, a managed file). The same result is available offline with `npm run standards:check`, and no token is needed for CI to check out the central private repo.
- Directory and router rules are only reported as warnings at first.

## Consequences

- Sub-repos have no write access to the central repo.
- Fixing a violation must be handled by a person through a central PR. In return, the reason a rule changed is recorded in the central repo's issues and ADRs.
- The check script itself is a managed file, so editing the script in a sub-repo to pass the check is also detected by hash comparison. However, the script checks its own hash, so deliberate bypass is not prevented. The central `compliance.yml` independently re-checks the sub-repo file hashes.
