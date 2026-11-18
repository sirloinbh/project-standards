# #713 Keep the 2026-11-18 architecture review in docs/reviews

## Change

| File | Content |
|---|---|
| `docs/reviews/2026-11-18-architecture-review.md` | New. Macro-level review of this repo (structure, dependencies, tool fit, unnecessary code, duplication, refactoring plan, efficiency) and a cross-app comparison of the 8 apps, ending with 10 recommendations ordered by payoff over effort |

## Why

The review existed only in one local worktree. Keeping it in the repo lets follow-up issues link to the finding they act on.

## Verification

- `npm run check`: passed (tests 657,pass 655,fail 0,skipped 2)
