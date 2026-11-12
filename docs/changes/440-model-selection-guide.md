# #440 Model selection guide

## Changes

| File | What |
|---|---|
| `docs/model-selection.md` | New guide: model and effort per task type, operating rules, how the subagent model is set, instruction-size criteria |
| `AGENTS.md` | Links the guide from the work procedure |

## Findings

- `~/.claude/settings.json` has `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` and `~/.claude/agents/Explore.md` has `model: haiku`. Both files exist; no settings outside the repo were changed.
- The local agent worker (`tools/agents/models.mjs`) routes to Codex models by role and is independent of the Claude settings.
- `CLAUDE.md` is 8 lines and `AGENTS.md` is about 65, both under 200.

## Not done (user steps)

- Confirm in a new session that `/agents` shows Explore on haiku and other subagents run on sonnet, then comment on #440.
- The Opus/Sonnet weekly limit question stays open; the guide says `/usage` is the reference.

## Verification

- `npm run check`
