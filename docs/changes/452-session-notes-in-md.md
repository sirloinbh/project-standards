# #452 Keep session notes in md files

Records of progress, decisions, and next steps now live in md files in the repo, not in the chat session, the prompt cache, or automatic memory. This lets one issue be one session (#440) and lets a new session, PC, or tool continue by reading files.

## Changes

| File | Change |
|---|---|
| `templates/common/skills/std-session-notes/SKILL.md` | New shared skill: where each kind of record goes, what to write before ending a session or `/clear`, what to read at the start, and that automatic memory holds only pointers |
| `.claude/skills/std-session-notes/SKILL.md` | Replica of the source |
| `templates/app/AGENTS.md.tmpl` | One sentence and a skill-list entry pointing to the skill; new sessions read the latest `docs/daily/` file first |
| `AGENTS.md` | Same pointer for this repo |
| `scripts/test/agents.test.mjs` | App repos must receive the new skill and its `.claude/skills` mirror |
| `scripts/test/fixtures/sync-snapshot.json` | Snapshot updated with the new files |

## Decisions

- Record locations: daily file (resuming work), change record (what changed and verification), ADR or issue comment (decisions), `docs/research/` (research).
- Automatic memory holds at most a pointer to the md file.
- Not done: a `Stop`/`SessionEnd` hook that checks the record was saved (optional in the issue). It needs its own issue.

## Left open

- The "Done when" item that a new session continued from the md file alone after `/clear` can only be shown in a later session; record it in an issue comment then.

## Verification

- `npm run check`
