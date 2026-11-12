# #244 Candidates to strengthen the shared ESLint and Prettier config

The survey results and the recommendation are in [docs/research/lint-rules.md](../research/lint-rules.md). No code was changed and nothing was installed.

## How it was checked

- Package info: `npm view <package> --json` (read-only), the deps.dev API (security advisories), the npm downloads API
- Violation counts: loaded `eslint` and `typescript-eslint`, which are already installed in the 8 apps, through the Node API, turned on `recommendedTypeCheckedOnly`, and counted. App files were not changed.

## Next steps

- When the user confirms the recommendation, write it in "Decision".
- In #245, get approval to install 4 packages, and in #246 put them into the shared config.
