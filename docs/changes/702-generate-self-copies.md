# #702 Generate this repo's own skill, hook, and template copies

## Change

| File | Content |
|---|---|
| `scripts/build-self.mjs` | New. `npm run self` writes `.claude/skills/`, `.claude/hooks/`, `.claude/settings.json`, `.codex/rules/`, `.codex/hooks.json`, `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md` from `templates/common/`. Skills with `{{` variables are skipped, as in the plugin. `--check` reports stale, missing, and unexpected files |
| `scripts/test/build-self.test.mjs` | Tests the current copies, the skip rule, and check/write on a temp copy |
| `package.json` | `self`, `self:check`; `check` runs `self:check` |
| `.claude/rules/sources-and-copies.md` | The hand-copy rule is replaced by `npm run self` |

## Checks

- `node scripts/build-self.mjs --check` passes on the current tree (the copies were already identical).
- `npm run check` result is in the PR.
