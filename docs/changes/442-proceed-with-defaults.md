# Proceed with the default instead of asking (#442)

Issue: https://github.com/sirloinbh/project-standards/issues/442

## Purpose
Parallel agent sessions stall whenever one asks the user to pick an option. Give agents criteria for when to ask and when to proceed.

## Changes
- `templates/common/skills/std-implementation/SKILL.md`: new section "Decisions: proceed with the default". Ask only for irreversible, costly, public, requirement-conflicting, production-merge, user-only, and "user confirmation" decisions. Record choices made without asking in the PR "Check before merging" section and in docs/changes.
- `templates/common/.github/pull_request_template.md` and its copy `.github/pull_request_template.md`: the "Check before merging" comment now also covers choices made without asking.
- Issue template note ("choices already made") reviewed and not added: the PR record is enough, and it would add a field to every issue.

## Verification
- `npm run check` (see PR).
