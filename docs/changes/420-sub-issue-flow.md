# #420 Continue sub-issues in the same worktree and close the parent issue with them

The user asked for this on 2026-11-08. It adds the order of work and when to close to the parent and sub-issue rules made in #404.

## Change

| File | Content |
|---|---|
| `templates/common/skills/std-backlog/SKILL.md` | Summarized in rule 5. Added "continue the same parent issue first" and "proceed in the same worktree" to step 3 of chapter 5. Changed "when to close" in chapter 6 to when the last sub-issue closes |
| `.claude/skills/std-backlog/SKILL.md` | This repo's copy |

## Decisions

- **Order to continue:** If candidates remain under the parent issue of the issue just finished, pick from them. Move only when another parent issue has a candidate with a smaller priority number. Put the same parent issue before an `origin/added` issue of the same level in another area. The user did not decide this order directly.
- **Worktree:** In the same checkout where the cleanup after merge is done, create a new branch from `origin/main`. Step 1 of chapter 5, that the next issue starts only after the previous PR is merged, is unchanged.
- **Closing the parent issue:** When the last sub-issue closes, close it before picking the next task. Confirm 0 open sub-issues and leave a comment checked against the goal. If work remains in the goal, register it as a sub-issue and leave the parent open. A parent issue whose body says "keep open" (#411) is an exception.

## Checks

- `npm run check`: the result is written in the PR body.
