# #690 Decide one frontend data-loading library for all apps

User decision A (2026-11-19, relayed by the coordinator): `@tanstack/react-query` in all 8 apps.

## Change

| File | Content |
|---|---|
| `docs/adr/0027-react-query-for-data-loading.md` | The ADR: what each app does today, the comparison with a synced `useLoad` hook, the decision (5.104.1 in all apps, shared query layer, package in `optionalDependencies` so knip stays quiet in apps that have not migrated, screen-by-screen migration), the package review table, and the follow-up issues |
| `docs/dependency-policy.md` | The `@tanstack/react-query` row now says all 8 apps, with a link to the ADR |

## Issues opened

- sirloinbh/project-standards#788: ship the shared query layer (`lib/query.ts`, scaffold, `versions.json` optional dependency). Linked as a sub-issue of #664.
- One adoption issue per app, each blocked by #788 and each carrying the package review table as its approval record: workout-memo#394, plan-routine#178, health-log#220, money-ledger#213, cert-manager#161, dev-career-portfolio#152, study-log#287, life-journal#158.

## Notes

- The package review ran `npm view` on 5.104.1: released 2026-10-02, MIT, TanStack, one dependency (`@tanstack/query-core`), no install scripts, provenance attested. The bundle size in the ADR is a rough range, not measured.
- No file that sync sends to apps changed, so the app lint and typecheck check (LANES.md rule 11) did not apply to this PR.
