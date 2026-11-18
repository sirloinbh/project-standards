# #707 Drop the git subtree sub-repos (decision)

The user decided to drop the subtree sub-repos on 2026-11-19 (relayed by the coordinator). This change records the decision and files the work; it changes no code.

## Change

| File | Content |
|---|---|
| `docs/adr/0022-drop-subtree-sub-repos.md` | New ADR: drop the 24 sub-repos, deploy from the umbrella repo, remove the reconciler and sub-CI, close #653 |

## Follow-ups

- #728: remove the subtree machinery here (lockfile reconciler, `PACKAGE_FILES`, `push-repositories.ps1`) and move Docker contexts to the repo root.
- #729: delete the sub-CI files and sub-lockfiles in the 8 apps. It includes a **[Manual]** step: the user archives or deletes the 24 GitHub sub-repos.
- #653 is closed by this PR: its script is removed rather than fixed.

## Checks

- Docs only. `npm run check` result is in the PR.
