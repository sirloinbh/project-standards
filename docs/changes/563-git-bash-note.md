# #563 Git Bash note for the browser MCP setup

## What changed
`docs/tools.md` warns that Git Bash (and the `!` prompt in Claude Code on Windows) rewrites `cmd /c` into `cmd C:/`, which breaks the saved MCP command, and gives the fix: `MSYS_NO_PATHCONV=1`, or remove and re-add the entry.

## Why
Found during the user's install on 2026-11-18: both entries were saved as `cmd C:/ npx ...`. Re-adding them with `MSYS_NO_PATHCONV=1` saved the correct `cmd /c npx ...`.

## Verification
- `npm run check`
