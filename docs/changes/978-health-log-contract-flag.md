# #978 Mark health-log as using the shared contract (features.contract)

- Issue: [#978](https://github.com/sirloinbh/project-standards/issues/978)
- Branch: `docs/978-health-log-contract-flag`
- Related: sirloinbh/health-log#215, #783, ADR-0026, follow-up #986

## Purpose

health-log added `shared/contract.ts` back on 2026-11-22 (sirloinbh/health-log#215, user decision) and copies it to `backend/src/contract.ts` with the managed `npm run contract:sync`. The registry should say that health-log uses the contract.

## Finding — 2026-11-22

The registry already says it. `registry/projects.json` on `main` (755bc9d) has `features.contract: true` for health-log, so no registry change is needed:

- The issue assumed #783 had set the flag to `false` for health-log. It did not: the #783 commit `0ae4a10` added only `docs/changes/783-contract-flag-off.md`. The flag has been `true` for every app since #570 (`f323267`); `git log -G'"contract"' -- registry/projects.json` shows no later change.
- What the flag does for an app that already exists: `scripts/contract.mjs` and `scripts/test/contract.test.mjs` are synced to every app whatever the flag (they are no-ops without `shared/contract.ts`). `shared/contract.ts` and `backend/src/contract.ts` are written only by the scaffold of a new app (`scripts/scaffold.mjs`), never by the sync, so the sync neither overwrites nor deletes health-log's own contract. The only sync effect is `templates/index.json` `dependencyFields.onlyWith`: the frontend `zod` version is managed only with the flag on, and only where the app already lists `zod` (optional dependency); health-log's frontend does not list it (its contract imports nothing), so nothing is added.
- `npm run sync:preview` for health-log (with a checkout of health-log `main`) gives the same 218 files with the flag `true` and with it forced to `false`: no difference.
- Done criterion 2 already holds: health-log's sync PRs after #215 (sirloinbh/health-log#289, #295, #297) passed `standards-check` with `shared/contract.ts` and the `contract:*` scripts present.

## Follow-up

- #986: the five apps with no contract (study-log, life-journal, cert-manager, plan-routine, dev-career-portfolio) still have the flag `true`, which is the registry step #783 missed. `docs/changes/783-contract-flag-off.md` gets a correction note pointing there.

## Verification

- `npm run check` here: passed (616 tests: 611 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed). Docs only: no file under `templates/`, `scripts/` or `registry/` changes, so no sync PR follows.
