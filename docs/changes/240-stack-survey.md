# #240 Compare dependencies and tech stack of the 8 apps

The survey results and candidates for sharing are in [docs/research/stack-survey.md](../research/stack-survey.md). Nothing was installed.

## How it was checked

- Ran `git fetch` on the 8 app repos, then read and compared the 3 `package.json` files and 3 `package-lock.json` files on `origin/main` with `git show`.
- Open dependency PRs: `node tools/dependency-prs.mjs list`

## Docs fixed along the way

- `docs/stack.md`: changed the basis to the 8 apps and fixed the outdated "in use" columns (routing, styling, testing).
- `docs/dependency-policy.md`: removed the note "the lucide-react app install is still 0.468.0" (all 8 apps now have 1.52.0).
