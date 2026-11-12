# #16 Block npm installs by agents

## Change

| File | Content |
|---|---|
| `templates/common/.claude/settings.json` | 66 Claude Code `permissions.deny` entries: 26 install-type npm subcommands, plus npx, pnpm, pnpx, yarn, bun, bunx, and corepack, denied in both the Bash and PowerShell tools |
| `templates/common/.codex/rules/package-installs.rules` | 3 Codex `prefix_rule` entries (`forbidden`): the same command list |
| `.claude/settings.json`, `.codex/rules/` (central) | Same files as the templates. Applied to the central repo first |
| `templates/app/.prettierignore` | `.claude/settings.json` (#154 rule) |
| `scripts/test/agent-guardrails.test.mjs` | Central copy matches, Bash and PowerShell lists match, Codex list matches, and real verdicts when the Codex CLI is available |
| `docs/agent-guardrails.md` | Blocked commands, verified results, limits, how to change, sources |
| `docs/dependency-policy.md` | A sentence and link saying the user runs approved installs directly |

Downstream repo check: both files are fully managed files, so standards-check verifies them by hash. No separate check was created.

## Checks

- In the central repo, `npm install --dry-run` (Bash, PowerShell) and `FOO=1 npx --version` were denied. `npm run` and `npm ls` ran.
- With `codex execpolicy check` (Codex CLI 0.144.4), I confirmed 7 install-type commands are `forbidden`, and `npm run check`, `npm ls`, and `npm audit` do not match a rule.
- `npm run check` passed (161 tests). Sync snapshot: 2 files added to each of the 9 repos.

## Follow-up fix: add npm aliases

The automated security review found missing aliases. npm also accepts short and misspelled aliases of `install` (`ins`, `inst`, `insta`, `instal`, `isnt`, `isnta`, `isntal`), the misspelled alias `udpate` of `update`, and `link` (`ln`), which installs dependencies. I added them to all three lists (Bash, PowerShell, Codex), bringing the deny rules to 86. I confirmed that `npm insta --dry-run` is denied and checked the `codex execpolicy check` verdicts. A PreToolUse hook that parses the command before blocking it will be considered in #162.
