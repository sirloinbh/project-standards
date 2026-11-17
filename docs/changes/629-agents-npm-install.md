# #629 Allow agents to run `npm install`

## Change

| File | Content |
|---|---|
| `templates/common/.claude/hooks/block-package-installs.mjs` (and the copy in `.claude/hooks/`) | `install` and its aliases and typos are treated like `npm ci`: allowed unless an option or environment variable turns install scripts on. Block message updated |
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | The Bash and PowerShell deny entries for `install`, `i`, `in`...`isntall`, and `add` are removed |
| `templates/common/.codex/rules/package-installs.rules` (and the copy) | The same words are removed from the forbidden list |
| `scripts/test/package-install-hook.test.mjs`, `scripts/test/agent-guardrails.test.mjs` | Former "blocked install" cases are now allowed cases; new cases check that `install` with scripts on is still blocked; blocked-command samples use `update` |
| `docs/agent-guardrails.md`, `docs/dependency-policy.md`, `AGENTS.md` | The rule text |

## Decisions

- User decision 2026-11-18 (chat, while approving #621): agents may run `npm install`; broad scope, not only approved packages.
- Install scripts stay off (`.npmrc` `ignore-scripts=true`, and the hook blocks turning them on). `update`, `uninstall`, `exec`, `init`, `rebuild`, `dedupe`, `link`, `npx`, pnpm, yarn, bun, and corepack stay blocked.
- Dependency policy is unchanged for new packages (exact version, 14 days, no install scripts, record in the PR).
- This repo has no dependencies, so `npm install` is still not run here.
- Codex users must trust the changed `.codex/` files again if Codex asks.

## Verification

- `npm run check`: recorded in the PR body
