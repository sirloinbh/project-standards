# 1213 Project icon in the registry

- `registry/projects.schema.json` requires `icon` (a PascalCase `lucide-react` icon name) on every project; `registry/projects.json` sets it for the 8 apps (workout-memo `Dumbbell`, study-log `BookOpen`, health-log `HeartPulse`, life-journal `NotebookPen`, money-ledger `Wallet`, cert-manager `BadgeCheck`, plan-routine `ListChecks`, dev-career-portfolio `BriefcaseBusiness`; confirmed by the user on the issue).
- `templates/ui/frontend/src/lib/apps.ts.tmpl` imports `{{project.icon}} as CurrentAppIcon` and exports it, matching design-system `apps.ts.tmpl` (design-system#73).
- Test: `scripts/test/app-switcher.test.mjs` checks the icon in every rendered `lib/apps.ts` and that icons are unique.
- The switcher entries (`APPS`) stay without icons: `AppLink` in design-system has no icon field. Showing icons there is a design-system change.
