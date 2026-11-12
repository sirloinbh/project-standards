# #147 Leave the merge rule in the app AGENTS.md template to AGENTS.project.md

## Change

- `templates/app/AGENTS.md.tmpl` procedure step 5: PR review and merge rules follow each repo's `AGENTS.project.md`. If it does not specify them, only the user merges.
- `scripts/test/agents.test.mjs`: checks that the rendered AGENTS.md of all 8 apps has this sentence.

## Why

The current rule in workout-memo (origin/main) is "the agent merges without user confirmation when the required CI passes", with up to 2 automatic code reviews. But the central template was fixed to "only the user merges", so the first sync (#97) would overwrite that rule. Since workout-memo#136 moved that rule into `AGENTS.project.md`, the template leaves the decision to that file.

## Verification

- `npm run check` passed (results are in the PR body)
