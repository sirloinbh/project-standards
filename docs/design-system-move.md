# Design system move: inventory and plan

Plan for moving every UI, UX and design-system item out of project-standards into the new `sirloinbh/design-system` repository (epic #1153, inventory #1159). The decisions are on #1158 (delivery model A, name, visibility, hosting) and #1179 (Storybook); the ADR that records them is #1160.

This file is a plan, not a record of work done. Each later move card links to its rows by id (`M1`, `M2`, and so on). Update the "Status" column when a card merges.

## Decisions this plan relies on

- **Delivery model A (#1158).** design-system is the source. project-standards sync keeps delivering the UI files to the apps from a pinned design-system release, with per-app values (`DARK_ONLY`, `apps.ts`, and the other rendered `.tmpl` files) and the hash drift check unchanged. The apps get no new package install and no `npx`.
- **Name, visibility, hosting.** `sirloinbh/design-system`, **public** (user decision 2026-11-27, #1161: branch protection needs a public repository on the free plan), showcase at `design.daysofme.com` behind the shared sign-in. The repository exists.
- **Showcase is Storybook (#1179).** A dev dependency of design-system only, after a dependency-policy review in the PR.
- **Not decided here.** The version scheme and what counts as a breaking change (#1160), how sync fetches a release (a later card), and the order of the move cards.

## What "stays" means

project-standards stays the only thing that writes to the apps. So these things stay here even after the source moves:

1. The sync engine and its per-app rendering (`scripts/sync.mjs`, `scripts/lib/sync-*.mjs`, `scripts/lib/templates.mjs`, `scripts/lib/render.mjs`, `scripts/lib/vars.mjs`).
2. The registry keys that describe an app (`registry/projects.json` `features.ui`, `features.darkOnly`, `features.aiShell`, display names, colors). Per-app values are app data, not design data.
3. The checks that run in the apps (`.standards/check.mjs`, built from `scripts/standards-check.mjs`). An app repo runs them with no access to design-system, so the rules they check are copied to the apps with the other managed files.
4. A pin: `versions.json` records which design-system release sync delivers.

## Inventory

Legend for **Destination**: **Move** = the source goes to design-system and the project-standards copy is deleted. **Stay** = remains in project-standards. **Split** = part moves, part stays. **Pointer** = project-standards keeps a short page that links to design-system.

### A. UI component sources (`templates/ui/`)

| Id | Item | Destination | Consumers | Notes |
|---|---|---|---|---|
| A1 | `templates/ui/frontend/src/components/ui/*` (shadcn components: alert-banner, badge, button, card, checkbox, combobox, confirm-dialog, date-field, date-stepper, dialog, drawer, dropdown-menu, empty-state, field, input, label, native-select, notice, number-input, page-header, segmented-control, select, sheet, skeleton, sonner, spinner, stat-card, switch, textarea) with their `*.test.tsx` and helper `.ts` files | **Move** | Apps (managed files), sync, `ui-kit-english` test, knip, prettier, eslint | Source becomes `src/components/ui/` in design-system. The app path stays `frontend/src/components/ui/`. |
| A2 | `components/layout/*` (app-shell, ai-shell, app-switcher, theme-toggle) and tests | **Move** | Apps, `app-switcher` and `ai-shell-flag` tests, `docs/layout.md` | Reads per-app values from rendered files (see A4). |
| A3 | `lib/` plain files: `utils.ts`, `theme.ts`, `use-notice.ts`, `use-ai-chat.ts`, `ai-chat.ts`, `api.ts` and their tests | **Split** | Apps | `utils`, `theme`, `use-notice` are UI: move. `api.ts`, `ai-chat.ts`, `use-ai-chat.ts`, `session-watch.ts`, `auth-origin.ts`, `health.ts` are application plumbing, not design: **Stay** (their tests too: `frontend-api`, `frontend-auth-origin`, `frontend-session-watch`). Decide per file in the move card; the safe default is Stay. |
| A4 | Rendered `.tmpl` files: `lib/apps.ts.tmpl`, `lib/theme-config.ts.tmpl`, `lib/ai-config.ts.tmpl`, `lib/auth-config.ts.tmpl`, `public/theme-init.js.tmpl` | **Split** | Sync (renders them), apps | The shape of the file (template) moves with the components that import it; the values (`DARK_ONLY`, app list, URLs) stay in the registry and are rendered by sync. `ai-config` and `auth-config` are not design: **Stay**. |
| A5 | `sign-in.tsx`, `service-worker.ts` and its test | **Stay** | Apps, shared sign-in (ADR-0015) | Sign-in and PWA behaviour, not design system. Revisit when #1131 settles. |
| A6 | New: stories (`*.stories.tsx`), Storybook config, showcase pages | **New in design-system** | Showcase only | Must not be delivered to apps (the sync file list must exclude `*.stories.*`). `NOT_SCREEN_TEXT` in the check already skips `stories`. |

### B. Tokens and fonts

| Id | Item | Destination | Consumers | Notes |
|---|---|---|---|---|
| B1 | `design/tokens.json` (the token source) | **Move** | `build-tokens`, `gen-docs`, `cn-text-styles` test | Becomes `tokens/tokens.json` in design-system. |
| B2 | `scripts/build-tokens.mjs`, `scripts/test/tokens.test.mjs`, `npm run tokens`, `tokens:check` | **Move** | `npm run check` here | Removed from `check` in project-standards; design-system runs it. |
| B3 | `packages/design-tokens/` (`tokens.css`, `tailwind.css`, Pretendard fonts and licence, README, CHANGELOG, `package.json`) | **Move** | Apps import `@sirloinbh/design-tokens/*` | Package keeps its name and registry (GitHub Packages), so apps need no change. Publishing moves with it (B5). Tag history stays readable in project-standards. |
| B4 | `scripts/test/cn-text-styles.test.mjs` (cn must know every text style) | **Move** | Tokens and `utils.ts` | Needs both A3 and B1 in the same repo. |
| B5 | Release of the tokens package: `.github/workflows/publish.yml` (shared by all `packages/*`), `scripts/changelog-section.mjs`, `scripts/test/packages.test.mjs`, `docs/design.md` 4.3 | **Split** | Package release | The tag trigger for `design-tokens/v*` moves to a design-system workflow. The workflow here keeps the other packages. The user does the first publish and token setup (user step). |
| B6 | `versions.json` `@sirloinbh/design-tokens` and the generated `docs/versions.md` row | **Stay** | Sync renders `frontend/package.json` | Still the version apps pin. Source of the number becomes the design-system release. |
| B7 | `docs/design-tokens.md` (generated from `design/tokens.json` by `gen-docs`) | **Move** | Readers; the 12px rule text lives in `gen-docs.mjs` | Generator code for this one file moves with B1. Leave a **Pointer** page here. |

### C. Docs and decisions

| Id | Item | Destination | Notes |
|---|---|---|---|
| C1 | `docs/design-system.md` (common screen rules) | **Move**, leave a **Pointer** | Agents in apps still read it through the managed agent files, so the content must also reach the apps (see D2). |
| C2 | `docs/layout.md` | **Move**, **Pointer** | Describes A2. |
| C3 | `docs/ui-components.md` and `docs/ui-components/*.png` (11 screenshots) | **Move** | Replaced by the Storybook showcase (#1179); keep the screenshots only if the move card finds a use. |
| C4 | `docs/korean-text-check.md` | **Split** | The rule and the allow list belong to the checks (stay with `scripts/lib/korean-text.mjs`, see E3); the screen-text part moves. |
| C5 | `docs/research/ui-survey.md` and `docs/changes/*` records about UI (120, 121, 123, 124, 126, 242, 357, 685, 687, 688, 991, 1043, 1044, 1129, 1147 and the other UI cards) | **Stay** | History of project-standards. Link to them from the design-system README instead of copying. Change records are append-only. |
| C6 | `docs/pwa.md`, `scripts/pwa-icons.mjs`, `scripts/lib/pwa-icons.mjs`, `scripts/test/pwa.test.mjs`, `templates/app/frontend/public/*` | **Stay** | PWA manifest and icons are per-app generated files, not shared design. Revisit if icon style becomes a token. |
| C7 | ADR-0007 (shadcn, icons, emoji), ADR-0008 (neutral light and dark), ADR-0011 (dark-only), ADR-0020 (shared UI stays on sync) | **Stay**, mark | Accepted ADRs are not moved or rewritten. ADR-0020 gets "partly superseded by ADR-00NN" (#1160); the others get a pointer line. design-system keeps its own README with the current rules. |
| C8 | `docs/design.md`: 2 (decisions about UI), 4 (packages), 5.1 (classification of `templates/ui`) | **Stay**, update | Update pointers only (#1160). |
| C9 | `docs/stack.md` (Styling row), `docs/user-steps.md` (tokens publish steps), `docs/conventions/code.md` (frontend file names), `docs/directory-rules.md` (frontend folders) | **Stay**, update | Links change; frontend file-name rule stays (it is a code convention checked in apps). |

### D. Agent instructions and skills (the part sent to apps)

| Id | Item | Destination | Notes |
|---|---|---|---|
| D1 | `templates/ui/skills/std-ux-audit/SKILL.md.tmpl` (was `templates/app/skills/`, #1168) | **Move** to design-system, still **delivered by sync** | A UX audit skill is design knowledge, but apps run it, so it must keep arriving through `templates/app/skills/`. Source in design-system, delivery by sync (model A). |
| D2 | Frontend rules in `templates/app/AGENTS.md.tmpl` (links to design-system.md, 12px rule) and `templates/app/skills/std-foundation/SKILL.md` | **Stay**, update links | These are agent instructions for apps; they point to the design docs. After C1 moves they need an app-readable copy of the rules (delivered with the UI files as `docs/design-system.md`, or a link to the showcase). Open choice for the move card. |
| D3 | Frontend lint and knip settings tied to the UI kit: `eslint.config.mjs.tmpl` (labelled Input), `knip.json` (`components/ui/**`), `.prettierignore.tmpl` (`components/ui/`) | **Stay** | App tooling that treats the managed UI folder specially. The path does not change. |
| D4 | `.claude/rules/sources-and-copies.md`, `docs/design.md` 5.1 | **Stay**, update | Add design-system as the source of `templates/ui/` (via the pin). |

### E. Scripts, checks and tests

| Id | Item | Destination | Notes |
|---|---|---|---|
| E1 | `scripts/test/ui-kit-english.test.mjs` | **Move** | Checks the components for Korean text; it reads A1. |
| E2 | `scripts/test/app-switcher.test.mjs`, `dark-only.test.mjs`, `ai-shell-flag.test.mjs` | **Stay** | They test sync rendering of per-app values from the registry. They need a copy of the pinned UI files to render; read them from the delivered copy. |
| E3 | `standards-check.mjs`: `checkMinFontSize` (12px), `checkKoreanScreenText`, `checkFileNames`, `scripts/lib/korean-text.mjs` and their tests in `standards-check.test.mjs` | **Stay** | These run in each app through `.standards/check.mjs`. The rules are UI rules, so design-system owns the wording (docs) and project-standards keeps the code. Revisit if the check is also run in design-system. |
| E4 | `scripts/build-self.mjs` and `gen-docs.mjs` (the token doc part) | **Split** | Only the `design-tokens.md` generation moves (B7). |
| E5 | `scripts/lib/vars.mjs` (theme color, offline style from `darkOnly`), `scripts/lib/sync-plan.mjs` (`featureTemplates`) | **Stay** | Sync engine. `featureTemplates.ui` points at the pinned design-system copy once model A lands. |
| E6 | `scripts/scaffold.mjs` (copies the UI folder into a new app) | **Stay** | Reads the same pinned copy. |
| E7 | `templates/vitest/`, `templates/msw/`, `templates/query/`, `templates/lighthouse/`, `templates/e2e/` | **Stay** | App test and data-loading kits, not design. Lighthouse thresholds are UX; leave them until an audit card asks. |

### F. Registry and config

| Id | Item | Destination | Notes |
|---|---|---|---|
| F1 | `registry/projects.json` and schema keys `features.ui`, `features.darkOnly`, `features.aiShell` | **Stay** | Per-app values. See "What stays". |
| F2 | `sync.config.json` `featureTemplates.ui` and package list entry `@sirloinbh/design-tokens` | **Stay**, update | Points at the pinned design-system release instead of `templates/ui/`. |
| F3 | `templates/index.json` (manifest of `templates/ui` files, `frontend/package.json` dependency on design-tokens) | **Stay**, update | The managed-file list still describes what apps receive. |
| F4 | `docs/projects.md`, `docs/versions.md` | **Stay** | Generated from F1 and B6. |

## Order of moves

Each step keeps `npm run check` green and every app syncing. Items may be merged into fewer cards; the order is what matters.

1. **Create the repository** (#1161; user creates it): empty scaffold, CI, README, licence.
2. **Tokens (B1, B2, B4, B7).** First, because components depend on them and the package already has its own name. Then B3 and B5 (publish workflow, tag trigger). Apps keep importing `@sirloinbh/design-tokens`, so nothing changes for them.
3. **Components (A1, A2, A3 UI part, A4 shapes, E1).** Copy, then make project-standards read the pinned release; delete the local copy once sync renders identical output (the snapshot test must not change for the apps).
4. **Delivery (F2, F3, E5, E6).** Teach sync to fetch the pinned design-system release and fall back to the previous copy until the first release exists. This is the only step that changes how apps receive files.
5. **Docs and skill (C1, C2, C3, C4 part, D1, D2).** Move and leave pointers; update `AGENTS.md`, rules and `docs/design.md`.
6. **Showcase (A6, #1180 and later).** Storybook scaffold, then pages and tests; hosted at `design.daysofme.com`.
7. **Clean-up.** Remove dead references, run the link check, and record the move in `docs/changes/`.

## Risks to settle in the move cards

- **Sync needs the files at run time.** `sync.yml` runs in project-standards with a token. The repository is public, so reading it needs no token. Only adding it as a sync target (#1163) needs the GitHub App installation to include it (a user step).
- **Snapshot of files apps receive.** `scripts/test/fixtures/sync-snapshot.json` must not change when the source moves; a changed snapshot means a behaviour change and needs a review.
- **Per-app tests.** E2 tests render per-app values against the UI folder; they must keep a real copy to run against.
- **Two writers.** Only sync writes to the apps. design-system never opens PRs in app repositories (model A).
