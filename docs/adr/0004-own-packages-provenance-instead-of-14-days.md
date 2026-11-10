# 0004. Own packages are verified by provenance instead of the 14-day rule

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

External packages must follow the "14 days after release" rule. It buys time for a version poisoned by a supply-chain attack to be found and withdrawn. Applying this rule to our own packages (`@sirloinbh/*`) would delay each config fix by at least 2 weeks before it reaches sub-repos. But our own packages can also be poisoned if a token leaks, so they cannot be trusted without verification.

## Decision

Own packages are excluded from the 14-day rule. Instead, before opening a PR, sync checks all of the following.

1. The version was published by the central repo's `publish.yml` on a tag trigger. Local publish is forbidden.
2. The package version matches the git tag (`<pkg>/v<version>`), the GitHub Release for that tag has the publish run URL and commit SHA, and that run succeeded.
3. The sync PR body states the CHANGELOG for that version and the central commit SHA.
4. The sub-repo `standards-check` re-checks that the installed package has no install scripts and has 0 `dependencies`.

The existing rules (pinned version, 14 days elapsed, `--ignore-scripts`, pre-verification) apply unchanged to external `peerDependencies` required by our own packages. All stage 1 peers are versions already installed in the sub-repos.

## Consequences

- Our own config changes can go out as a sync PR right after merge.
- GitHub Packages does not support npm provenance. So the provenance check relies on GitHub Releases and Actions run records.
- Because the packages have no dependencies and no install scripts, no code runs at install time even if they are poisoned. The remaining risk is the config code that runs at lint and build time (the eslint-config factory). This risk is reduced by the user reviewing the CHANGELOG and diff links in the PR body.
