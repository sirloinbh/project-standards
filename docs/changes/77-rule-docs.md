# #77 Rule documents (stack, dependencies, Git, directories, design, environment variables)

## Change

| File | Content |
|---|---|
| `docs/stack.md` | Allowlist (area, technology, usage status, evidence file), the default setup of a new project, and the major upgrade procedure |
| `docs/dependency-policy.md` | Major version unification table (versions installed by the workout-memo lockfile), the exact version and `--ignore-scripts` rules, the procedure for adopting a new package (research, 14 days, user approval), and Dependabot security updates only |
| `docs/git-conventions.md` | std-git-writing summary table, per-repo merge policy, and a branch protection checklist |
| `docs/directory-rules.md` | Standard directory tree, React Router URL rules, Express `routes/` modules and `/api` path rules, `shared/contract.ts`, and OpenAPI |
| `docs/design-system.md` | Common design rules: how to use tokens (only the 6 theme colors differ per app), components, text styles, icons and emoji, loading, and responsive and accessibility |
| `docs/env-conventions.md` | The `.env.example` section structure and the `@desc @required @secret @used` comment rules |
| `README.md` | Links to the rule documents |

## Sources

- The directory and API rules come from workout-memo's actual structure.
  - The `pages` object in `frontend/src/app.tsx` (`/`, `/journal`, `/goals` …)
  - `register…Routes(app, pool)` in the 8 modules of `backend/src/routes/`
  - `/api/health`
  - `scripts/contract.mjs`
- The version table is the versions installed in workout-memo `package-lock.json`. While writing the document, I replaced placeholders such as `19.x` with real versions.
- The error response format is left blank in this document because it will be decided in #30.

## Checks

- Only documents changed. `npm run check` passed, and the document link check (PR body below).
