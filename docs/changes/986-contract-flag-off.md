# #986 Turn the contract flag off for the five apps without a contract

- Issue: [#986](https://github.com/sirloinbh/project-standards/issues/986)
- Branch: `chore/986-contract-flag-off`
- Related: [ADR-0026](../adr/0026-contract-is-opt-in.md), `783-contract-flag-off.md`, #978

## Changes — 2026-11-23

`features.contract` is now `false` in `registry/projects.json` for study-log, life-journal, cert-manager, plan-routine and dev-career-portfolio. It stays `true` for workout-memo, money-ledger and health-log. #783 meant to do this but only added its change record.

The flag gates only the scaffold and the optional frontend `zod` field, which none of these five apps lists, so the files downstream repos receive do not change.

## Verification

- `npm run sync:preview` runs; `npm run docs` changes no generated file.
- `npm run check`: passes, including the sync snapshot test (the list of received files is unchanged).
