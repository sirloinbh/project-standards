# Model selection guide

Which Claude model and effort to use for each kind of task, and the rules for keeping model choice from wasting the Max plan limit (#440, parent #438). The only evidence is the feel of the Max limit, so treat this as a default that you adjust, not a measured result.

## Models

| Name | Model ID | Alias in Claude Code |
|---|---|---|
| Opus 5.5 | `claude-opus-5-5` | `opus` |
| Sonnet 5.5 | `claude-sonnet-5-5` | `sonnet` |
| Haiku 5.5 | `claude-haiku-5-5` | `haiku` |
| Fable 5.2 | `claude-fable-5-2` | `fable` |

`opusplan` is a Claude Code alias, not a model. It plans with Opus 5.5 and executes with Sonnet 5.5.

## Choice by task

| Task | Model | Effort |
|---|---|---|
| General issue implementation (default) | `opusplan` | medium |
| Mechanical work: adding tests, docs, renaming, upgrading dependencies | Sonnet 5.5 | low to medium |
| Bulk translation or bulk rewrite across many files (for example the #453 translations) | Sonnet 5.5 for prose that needs judgment, Haiku 5.5 for purely mechanical edits | low |
| Design, tricky bugs, changes spanning several modules | Opus 5.5 | medium, high if stuck |
| Review of a risky change (workflows, sync, secrets handling) | Opus 5.5 | medium |
| Multi-hour large work | Fable 5.2, only after checking its dedicated weekly limit | medium |
| Exploration subagents (search, locate code) | Haiku 5.5 | not applicable |

## Operating rules

- Decide the model when you launch a worktree session and do not change it mid-session. Switching rebuilds the prompt cache, so the next request is expensive.
- One issue is one session. Run `/clear` when the work changes to a different issue.
- Avoid effort `max`. Raise from medium to high only when stuck.
- Run `/usage` before starting Fable 5.2 work, and once a week to see how close the weekly limits are (#445).
- Whether the Opus and Sonnet weekly limits are separate is not confirmed in the official docs. Until it is, `/usage` is the reference and this guide does not assume they are separate.

## How the subagent model is set

On this PC the settings live outside the repo (user-level files). This repo does not manage them and the sync does not copy them.

| Setting | Where | Effect |
|---|---|---|
| `"env": { "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet" }` | `~/.claude/settings.json` | Subagents without their own model run on Sonnet instead of the main model |
| `model: haiku` in the front matter | `~/.claude/agents/Explore.md` (read-only tools) | A user-defined Explore agent that runs on Haiku |

To revert, change `model` in `Explore.md` to `sonnet` or delete the file.

The Claude Code settings above are separate from the local agent worker (`tools/agents`, [docs/tools.md](tools.md#local-agent-worker-toolsagents)). The worker does not run Claude. It routes by role in `tools/agents/models.mjs` to Codex models, and passes them to the CLI as `--model` with `model_reasoning_effort`. Change that file to change the worker's routing; nothing in this guide affects it.

Checked on 2026-11-14 (#440): a live session lists Explore with exactly the tool set of the user-defined file, so the file loads. Orca runs Claude Code with its own config folder (`%APPDATA%\orca\claude-profiles\<id>\home`) and copies keys from `~/.claude/settings.json` into its `settings.json`. That folder also has its own `agents/Explore.md`. When you change a user-level setting, check both places.

## Other user-level settings on this PC

These also live outside the repo, in `~/.claude/settings.json` and the Orca profile `settings.json`.

| Setting | Value | Why |
|---|---|---|
| `autoUpdatesChannel` | `stable` | Fewer updates, so fewer restarts and prompt-cache rebuilds (#445). `latest` is the other value |
| `crossSessionInbound` | `accept` | Messages from your other local sessions (other worktrees) are delivered without the Approve/Deny dialog (#419). The dialog appears when one session bypasses permissions and the other does not. Other values: `hold`, `refuse`. Also settable in `/config` as "Messages from your other sessions" ([docs](https://code.claude.com/docs/en/cross-session-messaging.md)) |

MCP servers: the connected servers' tools are deferred (only names are listed until a tool search loads them), so they do not add tool definitions to every session. Turn off a server you never use in `/mcp`.

## Keeping instructions small

- `CLAUDE.md` and `AGENTS.md` should stay at 200 lines or fewer. Today `CLAUDE.md` is 8 lines and `AGENTS.md` is about 65.
- Move a task procedure into a skill (`templates/common/skills/`) when it applies to one kind of task only, is longer than about 10 lines, and is not needed in most sessions. Keep in `AGENTS.md` only what every session needs: the work procedure, prohibited actions, and verification commands.
- Path-specific rules go in `.claude/rules/`, which loads only when matching files are touched.

## Sources

[Model config](https://code.claude.com/docs/en/model-config.md), [costs](https://code.claude.com/docs/en/costs.md), [sub-agents](https://code.claude.com/docs/en/sub-agents.md), [prompt caching](https://code.claude.com/docs/en/prompt-caching.md), [Max plan usage](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-max-plan).
