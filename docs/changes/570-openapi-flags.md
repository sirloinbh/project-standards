# #570 Turn on the OpenAPI and contract flags for the other 7 apps

## Change

| File | Content |
|---|---|
| `registry/projects.json` | study-log, health-log, life-journal, money-ledger, cert-manager, plan-routine, dev-career-portfolio: `features.openapi` and `features.contract` on (workout-memo was already on) |

No test, generated doc, snapshot, or other doc text assumed that only workout-memo has these flags, so none of them changed. `npm run docs` and `UPDATE_SNAPSHOT=1 npm test` produced no diff, because no template or generated table depends on the two flags.

## Decisions

- The app PRs that add `docs/openapi.json` with its staleness test, and `shared/contract.ts` with `contract:check`, are merged first (#570 app PRs for study-log, health-log, life-journal, money-ledger, cert-manager, plan-routine, dev-career-portfolio). This PR waits for all 7.
- "Contract" here means `shared/contract.ts` plus `contract:check`, as in [directory-rules.md](../directory-rules.md). It is not the MSW mock, so `features.msw` stays off.
- The flags describe what each app repo has; central tooling does not render files from them yet.

## Verification

- `npm run check`: recorded in the PR body
