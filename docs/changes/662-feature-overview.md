# #662 Add the `std-feature-overview` skill

The user types `/std-feature-overview` in any synced repo to get a Korean explanation of the repo's features and 3 to 7 recommended new features.

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-feature-overview/SKILL.md` | New skill with `disable-model-invocation: true`; read-only; checks open issues before recommending; offers std-backlog registration |
| `templates/common/skills/std-communication/SKILL.md` | Added the "Korean exception" section for this skill |
| `scripts/test/agents.test.mjs` | App repos must get the skill (and its `.claude/skills` mirror); the frontmatter check allows extra keys such as `disable-model-invocation` |
| `.claude/skills/`, `plugins/sirloinbh-standards/` | Regenerated with `npm run self` and `npm run plugin` |
| `scripts/test/fixtures/sync-snapshot.json` | Regenerated: every profile gets the new skill files |

## Decisions

- Skills under `templates/common/skills/` are synced to every profile automatically, so no registry change was needed.
- The user's later replies stay English; only this skill's answer is Korean.

## Checks

- `UPDATE_SNAPSHOT=1 npm test`: 549 passed, 1 skipped.
- `npm run check`: see the PR.
