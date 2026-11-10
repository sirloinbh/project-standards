# Tech Stack

The technologies the 8 apps may use (the allow list) and the default setup for new projects. The basis is the current implementation of the 8 apps (compared on 2026-10-28: [research/stack-survey.md](research/stack-survey.md)). Versions are sourced from [versions.json](../versions.json) and can be viewed in [versions.md](versions.md). The majors of packages used by only one app are in [dependency-policy.md](dependency-policy.md).

## Allow list

| Area | Technology | Status | Basis |
|---|---|---|---|
| Runtime | Node.js 24, npm 11, npm workspaces | Used by all 8 apps | Each repo's `.nvmrc`, `packageManager` |
| Frontend | React 19, Vite, TypeScript | Used by all 8 apps | `frontend/package.json` |
| Routing | React Router (`BrowserRouter`, `NavLink`) | Used by all 8 apps | `frontend/src/app.tsx` |
| Server state | TanStack Query | workout-memo | `frontend/package.json` |
| Forms | React Hook Form + `@hookform/resolvers` + Zod | workout-memo | `frontend/package.json` |
| Styling | Tailwind CSS 4 + `@sirloinbh/design-tokens` | Used by all 8 apps | [design-system.md](design-system.md) |
| UI components | shadcn/ui (source owned directly), Radix UI | Decided (ADR-0007) | [ADR-0007](adr/0007-shadcn-ui-icons-emoji.md) |
| Icons and emoji | lucide-react, Fluent Emoji Flat | Decided (ADR-0007) | Same ADR |
| Backend | Express 5, pg, Zod | Used by all 8 apps | `backend/package.json` |
| DB | PostgreSQL 17 | Used by all 8 apps | `compose.yaml` |
| Runtime environment | Docker Compose, nginx | Used by all 8 apps | `compose.yaml`, `frontend/nginx.conf` |
| Testing | node:test (backend), Vitest + Testing Library (UI), Playwright (browser) | 8 apps (Playwright in workout-memo) | Verification commands in workout-memo `AGENTS.md` |
| CI | GitHub Actions, central shared CI | Central repo | [reusable-app-ci.yml](../.github/workflows/reusable-app-ci.yml) |
| Infrastructure | Terraform, AWS Lightsail | shared-aws-infrastructure | ADR-0005 |

To adopt a library or tool that is not on this list, open an issue in the central repo and follow the adoption procedure in [dependency-policy.md](dependency-policy.md).

## Default setup for new projects

- Use all the technologies in the table above. The standard scaffold (`scaffold/app`, #85) builds the project with this setup.
- Follow [directory-rules.md](directory-rules.md) for directories and URLs.
- Ports and DB names are set by the registry slot formula (README "Adding a new project").

## Major upgrade procedure

1. Open an issue in the central repo. Summarize the changes (official release notes) and the affected code.
2. Check that the new version is at least 14 days past its release.
3. If needed, write an ADR and update the version table in [dependency-policy.md](dependency-policy.md). Also update the peerDependencies of the shared packages.
4. Apply it to workout-memo first and pass CI, e2e, and visual checks.
5. Apply it to the other apps through a sync PR or per-repo PRs. The user merges the app repo PRs.
