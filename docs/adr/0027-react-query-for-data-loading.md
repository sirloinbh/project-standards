# 0027. @tanstack/react-query is the data-loading library for all 8 apps

- Status: Accepted (issue #690, parent #664; user decision A on 2026-11-19, relayed by the coordinator)
- Date: 2026-11-19
- Builds on: [ADR-0007](0007-shadcn-ui-icons-emoji.md) (frontend stack), [dependency policy](../dependency-policy.md), and #682 (`requestJson` takes an abort signal).

## Context

No app has a client cache. Each one loads data with its own `useEffect` loop:

| App | What the architecture review (2026-11-18) found |
|---|---|
| workout-memo | Already uses `@tanstack/react-query` 5.104.1 |
| plan-routine | Hand-written load loop in six screens |
| health-log | A hand-made mutation tracker and a polling hook |
| money-ledger | Version counters passed down as props to force reloads |
| cert-manager | Reloads a 2,800-row list on every visit |
| dev-career-portfolio | `use-load.ts` loads the same list three times |
| study-log, life-journal | Own load loops, no shared cache (judged from the `useEffect` counts below; not reviewed in detail) |

`useEffect` counts in each app's `frontend/src` (a rough size of the loops): workout-memo 39, study-log 68, health-log 64, life-journal 16, money-ledger 67, cert-manager 17, plan-routine 38, dev-career-portfolio 12. The scaffold already uses `QueryClientProvider` and `useQuery`, so new apps start with it.

## Comparison

| | `@tanstack/react-query` | Synced in-house `useLoad` hook |
|---|---|---|
| Cache and de-duplication | Built in (keyed cache, one request for the same key) | To build and maintain |
| Invalidation after a write | `invalidateQueries`, mutations | To build |
| Refetch on focus, retry, backoff | Built in, configurable | To build |
| Abort on unmount | Built in (passes a signal) | To build |
| Size | Roughly 10 to 15 kB gzip (not measured here), one runtime dependency (`@tanstack/query-core`) | Small, but grows into the same features |
| Package approval | Needed in 7 apps (already in workout-memo and the scaffold) | None |
| Maintenance | Upstream; MIT; provenance published | Central repo, forever |

## Decision

1. All 8 apps use `@tanstack/react-query`, pinned to **5.104.1** (the version workout-memo and the scaffold already use).
2. The central repo ships a small query layer in the synced UI set (`lib/query.ts`): shared `QueryClient` defaults, `useApiQuery` and `useApiMutation` on top of `requestJson` (so errors are `RequestError` and the abort signal is passed), and a key convention. Work is tracked in #788.
3. The package is **not** a managed field in `versions.json` (that would add it to every app, and knip would flag it as unused in apps that have not migrated). It goes in `optionalDependencies`, which pins the version only in apps that already list it; each app adds the package in its own adoption issue.
4. Apps migrate screen by screen in their own issues. A screen keeps its own `useEffect` loop until it moves; no big-bang rewrite.
5. The hand-written helpers listed in the table above (plan-routine's loops, health-log's polling and mutation tracker, money-ledger's version counters, dev-career-portfolio's `use-load.ts`) are removed by the adoption issues, not by the central change.

## Package review (docs/dependency-policy.md, procedure steps 2-4)

The user's decision stands in for the approval in procedure step 5 for all 8 apps; each adoption issue repeats this table as its record.

| Check | `@tanstack/react-query` 5.104.1 |
|---|---|
| Released | 2026-10-02 (48 days before the decision) |
| License | MIT |
| Publisher, repository | TanStack, `github.com/TanStack/query` |
| Install scripts | None (no `preinstall`, `install`, `postinstall` or `prepare`) |
| Dependencies | One: `@tanstack/query-core` 5.104.1 (same release) |
| Provenance | SLSA provenance attestation published |
| Already in use | workout-memo and the scaffold, same version |

Each adoption issue installs with `npm install --ignore-scripts --save-exact @tanstack/react-query@5.104.1`, aligns the sub-lockfiles (`npm run lockfiles:sync`) and records the `ioc-scan` result in its PR.

## Revisit when

- A newer major of the library changes its API in a way the shared layer cannot hide.
- A screen needs offline mutation queues or persistence; that is a separate decision.

## Consequences

- Adoption issues, one per app, each blocked by #788: workout-memo#394 (only switches to the shared layer), plan-routine#178, health-log#220, money-ledger#213, cert-manager#161, dev-career-portfolio#152, study-log#287, life-journal#158.
- `docs/ui-components.md` and the scaffold will mention the query layer when #788 merges.
- The dependency policy table (`docs/dependency-policy.md`) lists the package for all 8 apps once the adoption issues are done.
