# Fix the std-implementation link to std-testing (#1202)

`templates/common/skills/std-implementation/SKILL.md` linked to `std-testing`, which only app repos receive, so `links:check` failed in the design-system repo. The skill now names `std-testing` in plain text and says it is delivered to app repos only.

Verification: `UPDATE_SNAPSHOT=1 npm test` (the snapshot changes only for this file in every repo), `npm run check`.
