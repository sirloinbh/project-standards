# #708 Archive tools/agents

The user chose to archive the Codex worker on 2026-11-19 (relayed by the coordinator): only workout-memo had `.agents.json`, and interactive agents now do the review-and-merge loop.

## Change

| File | Content |
|---|---|
| `tools/agents/`, `tools/agents.ps1` | Removed. The last `main` commit that had them is kept on the branch `archive/tools-agents` |
| `scripts/test/agent-*.test.mjs` (11 files) | Removed with the code (about 3,300 lines of tests that ran in every `npm run check`) |
| `package.json` | `test:agents` removed |
| `.github/workflows/agents.yml` | Removed (the Windows job that only ran `test:agents`) |
| `tools/install.ps1`, `scripts/test/tools.test.mjs` | The installer no longer copies the worker, `registry/projects.json` or `versions.json` (only the worker used them); tests updated |
| `docs/tools.md`, `docs/model-selection.md`, `docs/design.md`, `docs/user-steps.md`, `AGENTS.md` | Worker sections, the auto-merge table, the `.agents.json` exception, and the `test:agents` row removed or replaced by a pointer to the archive branch |
| `templates/app/AGENTS.md.tmpl` | The sentence about agent-worker PRs and `.agents.json` removed; the next sync PRs update `AGENTS.md` in the apps |

## Not changed

- Old ADRs (`0013`, `0016`) keep their history text.
- Leftover `.agents.json` files in app repos (for example workout-memo) are not edited here; see the follow-up issue.
- An installed copy under `%LOCALAPPDATA%\sirloinbh-tools\` (`agents.ps1`, `agents\`) stays until the user deletes it (a user step).

## Checks

- `node --test scripts/test/tools.test.mjs` passes; the sync snapshot is unchanged.
- `npm run check` result is in the PR.
