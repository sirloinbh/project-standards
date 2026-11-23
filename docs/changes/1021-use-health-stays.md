# #1021 Move useHealth to the shared query layer, if it fits

- Issue: [#1021](https://github.com/sirloinbh/project-standards/issues/1021)
- Branch: `docs/1021-use-health-stays`
- Related: [ADR-0027](../adr/0027-react-query-for-data-loading.md), sirloinbh/money-ledger#278

## Changes — 2026-11-23

Decision: `useHealth` does not move to `useQuery`. ADR-0027 has a new section "Not moved: `useHealth`" with the reasons (the opt-in `query` feature would leak into `templates/ui`, a `QueryClientProvider` would be needed wherever the hook renders, and five overrides would be needed to undo the shared client's defaults). No template changes, so the sync output is unchanged.

## Verification

- `npm run check:docs` (docs-only change).
