# 455 tools: translate Korean in tools/ to English

## What changed

- Translated comments, CLI messages, usage text, and table headers in `tools/labels.mjs`, `tools/dependency-prs.mjs`, `tools/repos.mjs`, `tools/app-secrets.mjs`, and `tools/agents/cli.mjs` (job change-record and PR body text).
- Translated the body of `tools/global-instructions/git-branches.md`. The heading still contains "git CLI", which `tools/install.ps1` and the PC setup hook match on.
- Updated the tests that assert these strings in `scripts/test/`.

## Kept in Korean

- Label name examples in a `tools/labels.mjs` comment (data that is matched).
- The `예|네` answers accepted by the y/N prompts in `tools/labels.mjs` and `tools/dependency-prs.mjs` (user input).
- `완료 기준` in `tools/agents/workflow.mjs` (matched against issue bodies).
- Korean label names in `scripts/test/labels.test.mjs` (test data).

## Verification

- `npm run check`: passed.
- `npm run test:agents`: run, see PR.
