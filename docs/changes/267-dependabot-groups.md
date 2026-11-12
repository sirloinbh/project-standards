# #267 Group Dependabot security updates into 2 PRs per app

## Problem

The same 3 security updates (`zod`, `body-parser`, `undici`) were open as 34 PRs across the 8 apps (#256 survey). Each app has 3 lockfiles, so Dependabot opened separate PRs per directory.

## Change

| File | Content |
|---|---|
| `templates/app/.github/dependabot.yml` | One npm entry with `directories: [/, /frontend, /backend]`. `applies-to: security-updates` in `groups` splits a minor-and-patch group and a major group. `open-pull-requests-limit: 0` (blocks version update PRs) and the github-actions entry are unchanged |
| `scripts/test/dependabot.test.mjs` | Checks one npm entry, 3 directories, version updates blocked, and the two security update groups |
| `docs/dependency-policy.md` | Grouping rules and the order for handling existing PRs |

Basis: the GitHub docs [Configuring Dependabot security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates) — using `applies-to: security-updates` in `groups` groups security updates into one PR, and listing every manifest location in `directories` groups across directories.

## Verification

- `node --test scripts/test/dependabot.test.mjs`: 3 passed
- `npm run check`: 441 of 442 tests passed, 1 skipped, 0 failed
- The real grouping behavior will be checked in the next Dependabot run after the sync PRs reach the apps.
