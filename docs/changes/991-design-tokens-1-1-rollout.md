# #991 Raise design-tokens to 1.1.0 in versions.json

- Issue: [#991](https://github.com/sirloinbh/project-standards/issues/991) (parent [#988](https://github.com/sirloinbh/project-standards/issues/988) Lean shared design tokens)
- Branch: `chore/991-design-tokens-1.1.0`
- Earlier step: [#989](https://github.com/sirloinbh/project-standards/issues/989) (PR #990) shipped the Pretendard dynamic subset in the package.
- Downstream issue: sirloinbh/health-log#305

## Change — 2026-11-22

| File | Change |
|---|---|
| `versions.json` | `packages.@sirloinbh/design-tokens` 1.0.0 → 1.1.0 |
| `docs/versions.md` | Regenerated (`npm run docs`) |
| `scripts/test/templates.test.mjs` | The expected `@sirloinbh/design-tokens` field is read from `versions.json` instead of a fixed `1.0.0`, as the eslint-config field already is |

## Decisions

- 1.1.0 is released: on 2026-11-22 the user pushed the tag `design-tokens/v1.1.0` at 5e3ca76 (the #990 merge). The `publish` run 45009652071 passed, and the Release `@sirloinbh/design-tokens/v1.1.0` exists.
- The only change for apps is the font delivery. The family name, the weights, `tokens.css` and `tailwind.css` are the same as in 1.0.0, so no app code changes.

## What the sync PR needs

The sync PR changes only `frontend/package.json` `@sirloinbh/design-tokens` to 1.1.0 and leaves the lockfile alone, so its CI fails at `npm ci`. On each app's sync PR branch, align the lockfile:

```
npm install --ignore-scripts
npm run lockfiles:sync
```

`@sirloinbh/*` packages are our own, so they are checked by source instead of the 14-day rule (ADR-0004). No new external package comes in (1.1.0 still has 0 dependencies).

Each app takes the bump in its own sync PR. health-log takes it under health-log#305 (the user approved that bump). The other apps' sync PRs are not merged as part of this issue.

## Verification

- `npm run check`: passed (617 tests: 612 pass, 0 fail, 5 skipped; registry, docs, tokens, self, packages, workflows and secret checks passed).
- `npm run sync:preview`: all 8 app manifests list `@sirloinbh/design-tokens` 1.1.0.
