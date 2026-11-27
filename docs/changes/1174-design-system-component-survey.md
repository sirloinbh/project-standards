# #1174 Survey of app-built components for the design system

- Issue: [#1174](https://github.com/sirloinbh/project-standards/issues/1174)
- Branch: `docs/1174-component-survey`
- Related: #1156 (design-system component cards), #1164 (the survey moves to design-system)

## Changes — 2026-11-27

Added [design-system-component-survey.md](../design-system-component-survey.md): 19 candidates found by comparing the 8 apps' `frontend/src/` with the shared `components/ui/` set, each with the apps and files that repeat it, a proposed API and an effort size, plus what is already shared, what stays in the apps, and a proposed card order. Docs only; the apps were read from shallow clones and not changed.

## Verification

- `npm run check:docs`
