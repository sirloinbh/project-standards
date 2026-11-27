# #1168 Move the UX audit skill and the UI rules in shared agent files to design-system

- Issue: [#1168](https://github.com/sirloinbh/project-standards/issues/1168) (parent #1155)
- Branch: `docs/1168-ux-audit-skill`
- Companion: sirloinbh/design-system `docs/1168-ux-audit-skill` (`delivery/ui/skills/std-ux-audit/SKILL.md.tmpl`)

## Changes — 2026-11-28

- `templates/app/skills/std-ux-audit/SKILL.md` moves to `templates/ui/skills/std-ux-audit/SKILL.md.tmpl`. The `ui` feature folder is the one design-system delivers once a release is pinned ([#1171](1171-sync-design-system-release.md)), so the skill follows the kit: today sync reads this copy, after the first release it reads `delivery/ui/skills/std-ux-audit/SKILL.md.tmpl` from the release. All 8 apps have `features.ui`, so each still receives the skill at the same paths (`skills/std-ux-audit/SKILL.md` and `.claude/skills/std-ux-audit/SKILL.md`); `sync-snapshot.json` does not change.
- The skill's links to the screen rules now point to design-system `docs/guidelines.md` and `docs/ui-components.md`.
- UI rules in shared agent files: the audit found only one, `std-foundation` step 4 (use the tokens and shared components). It now links to the design guidelines. `AGENTS.md.tmpl` and the `std-*` common skills carry no sizes, cursor or screen-text rules.
- ADR-0029 and the move plan (row D1) name the new path.

## Verification

- `npm run check`.
- The skill text is the same in both repositories (design-system copy added in the companion PR); #1170 removes this copy once a release is pinned.
- The file is `SKILL.md.tmpl` (sync drops the suffix, so apps still get `SKILL.md`). The skill links to `../std-backlog/SKILL.md`, which exists in an app but not in design-system, and design-system's link check would fail on a plain `.md` there; `.tmpl` files are not scanned.
