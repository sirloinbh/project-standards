# 0031. The design system moves to its own repository; sync keeps delivering it

- Status: Accepted (issue #1160, parent #1153; user decisions 2026-11-27 on #1158 delivery model A and #1179 Storybook)
- Date: 2026-11-27
- Supersedes in part: [ADR-0020](0020-shared-ui-stays-on-sync.md) (where the shared UI source lives). Its delivery decision (sync PRs, hash check, no shadcn registry) stays.
- Builds on: [ADR-0007](0007-shadcn-ui-icons-emoji.md), [ADR-0008](0008-neutral-light-dark.md), [ADR-0011](0011-dark-only-option.md), [ADR-0029](0029-standards-delivery-per-repo-group.md).

## Context

- Shared UI sources live in `templates/ui/`, tokens in `design/tokens.json` and `packages/design-tokens/`, and the UI checks and docs sit among the general standards. The UI is now a large part of this repository and changes often (epic #1123), so UI work and standards work share one history, one check run, and one lane.
- The user wants a repository of its own for the design system, with a showcase app that shows the shared components, and every UI item moved there (epic #1153). The inventory of what moves, stays, or splits is in [design-system-move.md](../design-system-move.md).
- Apps have no access to a second source: they receive files only from the sync bot, with per-app values rendered from the registry and a hash check in CI.

## Options (#1158, #1179)

| | A. design-system is the source; sync delivers a pinned release | B. npm package `@sirloinbh/ui` | C. design-system runs its own sync bot |
|---|---|---|---|
| Path to the apps | The existing one (sync PRs) | A new one (package install, version raises) | A second bot writing to the same apps |
| Per-app values (`DARK_ONLY`, `apps.ts`) and hash check | Kept | Lost; apps need a build step | Rebuilt in a second place |
| New installs in apps | None | A new package and build step | None |
| Conflicts | None | None | Two bots on one PR branch |

Showcase: a small hand-written Vite app (A) or Storybook (B).

## Decision

1. **Repository.** `sirloinbh/design-system`, private like the app repositories, unless the user changes it when creating it (#1161).
2. **Delivery: option A.** design-system is the source of the UI files, the tokens, and the UX audit skill. project-standards sync keeps delivering them to the apps from a **pinned design-system release**, with the same per-app values and the same hash drift check. The apps get no new package install and no `npx`. design-system never opens PRs in app repositories.
3. **Pin.** `versions.json` records the design-system release that sync delivers. Changing the pin is a normal PR here and opens the sync PRs.
4. **Tokens package.** `@sirloinbh/design-tokens` keeps its name and registry (GitHub Packages), so apps import it as today. Its source and release move to design-system.
5. **Showcase: Storybook** (#1179). Hosted at `design.daysofme.com` behind the shared sign-in (ADR-0015). Storybook is a dev dependency of design-system only, added after a dependency-policy review recorded in the PR (versions pinned with `--save-exact`, install scripts, publisher, licence), and run through package scripts, never `npx`. Stories are not delivered to apps.
6. **What stays here.** The sync engine and per-app rendering, the registry keys that describe an app (`features.ui`, `features.darkOnly`, `features.aiShell`), the checks that run in apps (`.standards/check.mjs`), the pin, and the PWA files. The rest of the plan is in [design-system-move.md](../design-system-move.md).

## Versioning

Design-system releases use semantic versions, tagged `v<major>.<minor>.<patch>` with a GitHub Release and a changelog.

| Bump | What it covers | Example |
|---|---|---|
| Major | A change that makes an app's own code or tests fail, or that needs an app edit to keep working | Remove or rename a component or export; change a prop type or default in a way callers notice; remove or rename a token; change the per-app template variables sync must supply; drop the supported Node or React version |
| Minor | A backward-compatible addition | A new component, prop, variant, or token |
| Patch | A fix with no API change | A style fix, an accessibility fix, a bug fix, docs |

- A visual change that keeps the API (colors, spacing, sizes) is a minor or patch bump and is called out in the changelog; the apps see it in their sync PR.
- The `@sirloinbh/design-tokens` package keeps its own version, following the same table. A design-system release lists the token version it needs.
- A major bump moves the pin only together with the app changes it needs. Sync PRs for it follow the existing wave order (ADR-0029) so a red app stops the rest.

## Consequences

- Positive: UI work gets its own history, review, and release. The path to the apps does not change, so the hash check, per-app values, and the compliance report keep working.
- Cost: sync needs read access to the private design-system repository (the GitHub App installation must include it; a user step). Each UI change is two merges (design-system, then the pin here). The per-app tests that render the UI files here need a copy of the pinned release.
- ADR-0020 stays accepted for delivery (no shadcn registry, no `packages/ui`). Only the location of the source changes. Its "Revisit when" still applies, now to design-system.
- Not decided here: how sync fetches a release (clone at the tag, release asset, or the GitHub API), and the order of the move cards. The inventory proposes the order.

## Revisit when

- The apps need to update the UI faster than a pin change plus sync PR allows, or sync PRs for UI changes keep failing in many apps at once. Then reconsider option B for the UI components only.
- Another repository besides the apps needs the components. Then publish them as a package.
