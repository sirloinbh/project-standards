# #198 Change the procedure to push package tags one by one

## Change

| File | Content |
|---|---|
| `docs/user-steps.md` 4-1 | Split the command that pushed 4 tags at once into one line per tag. Added the reason and how to recover if they were already pushed together |

## Decisions

- GitHub does not create push events when a single push has more than 3 tags. On 2026-10-24 in #88, we pushed 4 at once and publish did not run; we deleted the remote tags and pushed them again one by one, and all 4 were published.

## Verification
- `npm run check` passed (398 of 400 tests passed, 2 skipped; registry-check, docs check, tokens check, package-guard, check-workflows)
