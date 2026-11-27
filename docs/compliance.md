# Compliance status

<!-- Generated file (scripts/compliance.mjs). Do not edit by hand. Generated: 2026-11-27 23:17 UTC, central c789cca -->

| Repo | Synced | Central commit synced from | Managed files | Shared packages | Open sync PR | Sync wave | .env.example | Repo settings | Korean text | Work issues without epic | CI on main | Alerts (Dependabot / code scanning) | Last deploy | Oldest open PR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sirloinbh/workout-memo | ✓ | `5fde9f5` | ✓ match | ✓ | [#522](https://github.com/sirloinbh/workout-memo/pull/522) 0 days old | 1 | ✓ | ✓ | △ 46 md, 0 comments (partial scan) | ✗ 1 | ✓ today | ✗ 1 / 0 | today | [#522](https://github.com/sirloinbh/workout-memo/pull/522) 0d |
| sirloinbh/study-log | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 32 md, 0 comments (partial scan) | ✓ | ✓ today | ✗ 1 / 0 | today | none |
| sirloinbh/health-log | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 20 md, 0 comments (partial scan) | ✓ | ✓ today | 0 / 0 | today | none |
| sirloinbh/life-journal | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 13 md, 0 comments (partial scan) | ✓ | ✓ today | 0 / 0 | today | none |
| sirloinbh/money-ledger | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 17 md, 0 comments (partial scan) | ✓ | ✓ today | ✗ 0 / 1 | today | none |
| sirloinbh/cert-manager | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 18 md, 0 comments (partial scan) | ✓ | ✓ today | ✗ 1 / 0 | today | none |
| sirloinbh/plan-routine | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 3 md, 0 comments (partial scan) | ✓ | ✓ today | 0 / 0 | today | none |
| sirloinbh/dev-career-portfolio | ✓ | `5fde9f5` | ✓ match | ✓ | none | 2 (held by wave 1) | ✓ | ✓ | △ 11 md, 0 comments (partial scan) | ✓ | ✓ today | 0 / 0 | today | none |
| sirloinbh/design-system | not yet | — | — | — | [#25](https://github.com/sirloinbh/design-system/pull/25) 0 days old, CI red | 1 | — | ✗ 3 △ 1 | △ 1 md, 0 comments (partial scan) | ✓ | ✓ today | ? / ? | today (main merge, no deploy record) | [#25](https://github.com/sirloinbh/design-system/pull/25) 0d |
| sirloinbh/shared-aws-infrastructure | ✓ | `5fde9f5` | ✓ match | — | none | last (held by wave 1) | — | ✓ | ✓ | ✓ | ✓ today | 0 / 0 | today (main merge, no deploy record) | none |
| sirloinbh/shared-auth | ✓ | `5fde9f5` | ✓ match | — | none | last (held by wave 1) | — | ✓ | ✓ | ✓ | ✓ today | 0 / 0 | today | none |
| sirloinbh/shared-ai | ✓ | `5fde9f5` | ✓ match | — | none | last (held by wave 1) | — | ✓ | ✓ | ✓ | ✓ today | ✗ 0 / 4 | today | none |
| sirloinbh/develop-skill | ✓ | `5fde9f5` | ✓ match | — | none | 2 (held by wave 1) | — | △ 1 | △ 39 md, 0 comments (partial scan) | ✓ | ✓ today | 0 / ? | today (main merge, no deploy record) | none |
| sirloinbh/file-control | ✓ | `051729a` | ✓ match | — | none | 1 | — | ✓ | △ 4 md, 16 comments (partial scan) | ✓ | ✓ today | ✗ 0 / 1 | today (main merge, no deploy record) | none |

## Repo settings

The standards and reasons are in [repo-settings.md](repo-settings.md). Secrets and variables are compared by name only.

### sirloinbh/design-system

| Status | Item | Current | Expected |
|---|---|---|---|
| ✗ | CodeQL code scanning (default setup) | not-configured | configured |
| ✗ | Dependabot vulnerability alerts | off | on |
| ✗ | Dependabot security updates | off | on |
| △ recommended | Actions variable names | not in the list: PIN_APP_ID | none |

### sirloinbh/develop-skill

| Status | Item | Current | Expected |
|---|---|---|---|
| — plan | main branch protection | not available for private repos on the Free plan | on |
| — plan | secret scanning | not available for private repos on the Free plan | enabled |
| — plan | push protection (secret blocking) | not available for private repos on the Free plan | enabled |
| — plan | CodeQL code scanning (default setup) | not available for private repos on the Free plan | configured |
| △ recommended | Actions variable names | not in the list: WIKI_BUCKET, WIKI_DEPLOY_ROLE_ARN, WIKI_DISTRIBUTION_ID | none |


## Epic structure

Every open work issue belongs under an epic, and an epic whose sub-issues are all closed is closed by this run (#1065, std-backlog section 6). Link each issue below as a sub-issue of a fitting epic.

### sirloinbh/workout-memo

- No epic: [#453](https://github.com/sirloinbh/workout-memo/issues/453) Read only the needed sets in GET /api/analysis


## Korean text

Warning only for now (#493). Markdown files and code-comment lines that still contain Korean; the first 10 files per repo are listed. Literals that must stay Korean are on the allow list in `scripts/lib/korean-text.mjs`.

### sirloinbh/workout-memo

- `AGENTS.project.md`
- `README.md`
- `database/README.md`
- `docs/ai-agent-project-setup.md`
- `docs/api.md`
- `docs/changes/1-project-skills.md`
- `docs/changes/101-feedback-chips.md`
- `docs/changes/101-journal-card.md`
- `docs/changes/101-period-controls.md`
- `docs/changes/101-rest-timer.md`
- and 36 more

### sirloinbh/study-log

- `AGENTS.project.md`
- `docs/changes/10-study-log-api.md`
- `docs/changes/11-study-log-form.md`
- `docs/changes/118-loading-skeleton.md`
- `docs/changes/12-textbook-api.md`
- `docs/changes/121-content-order-limit.md`
- `docs/changes/13-textbook-contents.md`
- `docs/changes/134-migrate-entry.md`
- `docs/changes/14-study-log-textbook.md`
- `docs/changes/146-compose-rollback.md`
- and 22 more

### sirloinbh/health-log

- `database/README.md`
- `docs/changes/1-vite-port.md`
- `docs/changes/101-food-meal-char-count.md`
- `docs/changes/104-goal-card-refresh.md`
- `docs/changes/107-sober-week-goal.md`
- `docs/changes/114-next-steps.md`
- `docs/changes/120-label-columns.md`
- `docs/changes/122-paste-more-shapes.md`
- `docs/changes/126-card-save-focus.md`
- `docs/changes/127-list-retry.md`
- and 10 more

### sirloinbh/life-journal

- `docs/changes/153-count-reopen-wording.md`
- `docs/changes/215-item-tags-companions.md`
- `docs/changes/23-bucket-list.md`
- `docs/changes/41-item-link.md`
- `docs/changes/69-terms-screen.md`
- `docs/changes/70-wine-terms.md`
- `docs/changes/71-whisky-terms.md`
- `docs/changes/72-literature-terms.md`
- `docs/changes/73-stage-screen-terms.md`
- `docs/changes/74-coffee-category.md`
- and 3 more

### sirloinbh/money-ledger

- `docs/ai-classification.md`
- `docs/card-deduction.md`
- `docs/changes/102-halted-missing-days.md`
- `docs/changes/110-reserve-uncategorized.md`
- `docs/changes/123-english-comments.md`
- `docs/changes/125-english-docs.md`
- `docs/changes/154-merchant-suggestions.md`
- `docs/changes/198-entries-reload-filters.md`
- `docs/changes/199-classify-mixed-kinds.md`
- `docs/changes/201-fixed-costs-hidden-month.md`
- and 7 more

### sirloinbh/cert-manager

- `docs/changes/10-design-system.md`
- `docs/changes/101-english-records.md`
- `docs/changes/102-english-docs.md`
- `docs/changes/153-grade-scale-order-labels.md`
- `docs/changes/22-empty-state-word-wrap.md`
- `docs/changes/27-rename-to-cert-manager.md`
- `docs/changes/30-certification-goals.md`
- `docs/changes/32-exam-attempts-expiry.md`
- `docs/changes/33-study-plans.md`
- `docs/changes/36-word-list.md`
- and 8 more

### sirloinbh/plan-routine

- `docs/changes/110-english-records.md`
- `docs/changes/111-english-docs.md`
- `docs/changes/15-next-steps-issue-cards.md`

### sirloinbh/dev-career-portfolio

- `docs/changes/246-english-screen-text.md`
- `docs/changes/32-career-api.md`
- `docs/changes/33-project-api.md`
- `docs/changes/34-skill-api.md`
- `docs/changes/35-certification-api.md`
- `docs/changes/36-application-api.md`
- `docs/changes/37-cover-letter-question-api.md`
- `docs/changes/38-education-list.md`
- `docs/changes/39-education-form.md`
- `docs/changes/40-career-list.md`
- and 1 more

### sirloinbh/design-system

- `docs/screen-text-check.md`

### sirloinbh/develop-skill

- `cert-manager/concepts/backend-data.md`
- `cert-manager/concepts/dependency.md`
- `cert-manager/concepts/frontend-ui.md`
- `cert-manager/concepts/git-github.md`
- `cert-manager/concepts/security.md`
- `cert-manager/concepts/testing.md`
- `dev-career-portfolio/concepts/ai-agent.md`
- `dev-career-portfolio/concepts/architecture-process.md`
- `dev-career-portfolio/concepts/backend-data.md`
- `dev-career-portfolio/concepts/frontend-ui.md`
- and 29 more

### sirloinbh/file-control

- `CLAUDE.md`
- `README.md`
- `docs/worklog-2026-11-01.md`
- `docs/worklog-2026-11-02.md`
- `src/duplicates.js`
- `src/flattenNames.js`
- `src/product.js`
- `src/recycle.js`
- `src/sortPhotos.js`
- `src/ui/folders.js`


## Trend (last 14 days)

Items over time from [compliance-history.csv](compliance-history.csv): ✗ = failing items, △ = recommended items, all repos together.

| Date | ✗ | △ |
|---|---|---|
| 2026-11-27 | 10 | 13 |


To fix, follow "When standards-check fails in a sub-repo" in the [README](../README.md).
