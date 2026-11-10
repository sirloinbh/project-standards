# 0001. Division of roles between Plan A (npm packages) and Plan B (template sync)

- Status: Proposed (issue #1)
- Date: 2026-10-22

## Context

The 8 apps already share the same config files, such as ESLint, Prettier, tsconfig, and `.editorconfig` (design.md 1.1). But they are all copies, so fixing one place means repeating the fix 8 times. Some of the shared items can be loaded with `extends` or `import`, while others (`AGENTS.md`, skills, workflows, `.gitattributes`) only work when the file is physically in the repo.

## Decision

- Configs that can be loaded are distributed as Plan A packages: `@sirloinbh/eslint-config`, `prettier-config`, `tsconfig`, `design-tokens`.
- Items that must exist as files are distributed by Plan B template sync. The entry files that load the packages (`eslint.config.mjs`, `prettier.config.mjs` (`.prettierrc.json` before #246), `tsconfig.json`) are also Plan B managed files.
- A single `.standards/manifest.json` in each sub-repo is the source of truth for both paths. The central SHA, managed-file hashes, and package versions are all recorded there.
- Package version bumps also go through a Plan B sync PR. Version-bump PRs from Renovate or Dependabot are not used.

## Consequences

- When a config rule changes, only the package version needs to be bumped, and the entry files rarely change.
- Sub-repos now need private registry authentication. An authentication path must be designed separately for CI, Docker builds, and the production server (design.md 4.3).
- Because version changes flow through sync alone, `docs/compliance.md` shows at a glance which repo uses which version.
