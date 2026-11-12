# #361 Allow agents to run git branch commands automatically

## Change

| File | Content |
|---|---|
| `templates/common/.claude/settings.json.tmpl`, `.claude/settings.json` | Added `allow`, `ask`, and `deny` rules for git branch commands, for Bash and PowerShell |
| `templates/common/.codex/rules/git-branch.rules`, `.codex/rules/git-branch.rules` | Added rules of the same scope for Codex |
| `scripts/test/agent-guardrails.test.mjs` | Added a test that judges sample commands in the order deny, ask, allow |
| `scripts/test/fixtures/sync-snapshot.json` | Added the new rule files to the sync targets |
| `docs/agent-guardrails.md` | Recorded the allowed scope, the reasons, and the limits |

## Decisions

- The rules live in centrally managed files, not in per-PC global settings. The user step of applying them on each PC goes away, and app repos receive them through the sync.
- Instead of allowing all of `git switch`, options that discard changes need approval. For `git pull` only `--ff-only` is allowed, and for `git fetch` only `origin`.
- Changed the commands in the skill to `git switch --create` and `git branch --delete`. The PowerShell rules are case-insensitive, so `-c` and `-d` would be caught by the approval rules for `-C` and `-D`.
- The project `allow` rules apply only in trusted folders. A new PC or a new clone needs the trust to be accepted once.
- Force push and direct push to main were blocked until now only in the Bash global settings. They were put in the central rules so they are blocked in the PowerShell tool too.
