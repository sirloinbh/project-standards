# #118 Change the promotion rule for added requirements in std-backlog

## Change

- `templates/common/skills/std-backlog/SKILL.md` and `.claude/skills/std-backlog/SKILL.md`
  - Removed "requirements added during work" from the P0 criteria. P0 is used only for urgent or security items, or when the user says it is urgent.
  - An added requirement goes up only one level from its assessed priority. The cap is P1.
  - Promotion happens once, when registering, and the original priority is recorded in the body. It is not raised again when choosing the next task.
  - When choosing the next task, among the same priority, pick `origin/added` first.

## Why

Under the previous rule, all 75 added requirements (#3, #44–#117) would become P0. That removes the priority distinction among them, and low-priority documentation issues would be worked on before existing P1 issues. Also, promoting at every selection could raise the same issue repeatedly.

## GitHub settings (changes outside the repo)

- Changed the description of the `priority/P0` label to the new criteria.
- Re-adjusted the open `origin/added` issues under the new rule. Each issue got a comment with the reason, and the original priority was recorded in its body.
  - #3: P0 → P1 (original priority P1)
  - 10 issues registered as P2 → P1
  - 2 issues registered as P3 → P2
  - The 62 issues registered as P1 and #118 stay as they are because the cap is P1.

## Verification

- Compared the sources and copies with `diff` (no differences).
- After the re-adjustment, queried the open issues and confirmed that none of the `origin/added` issues is P0 and that every issue has exactly one priority label and one type label.
