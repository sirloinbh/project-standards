# #323 Add test outputs and personal settings files to the shared .gitignore

## Change

| File | Content |
|---|---|
| `templates/common/.gitignore.tmpl` | Added 7 entries to the central section: `.claude/settings.local.json`, `*.tfvars`, `test-results/`, `playwright-report/`, `blob-report/`, `coverage/`, `*.tsbuildinfo` |
| `scripts/test/templates.test.mjs` | Added the 7 entries as intended differences against the study-log baseline |

## Decisions

- It is a shared template, so the 8 apps and shared-aws-infrastructure all receive it. None of the repos checked has committed a file matching these patterns. The infrastructure repo's `terraform.tfvars.example` is not matched by `*.tfvars`.
- workout-memo and shared-aws-infrastructure already have the same lines under `# --- project ---`. The behavior is the same even if they overlap, so they can be removed in the app repo after the sync lands (not required).
  - workout-memo: `test-results/`, `playwright-report/`, `blob-report/`, `coverage/`, `*.tsbuildinfo`, `*.tfvars`, `.claude/settings.local.json`
  - shared-aws-infrastructure: `*.tfvars`

## Checks

- `npm test`: 490 of 491 passed, 1 skipped, 0 failed
- `npm run sync:preview`: 7 entries were added to the central section of the `.gitignore` in 9 repos
