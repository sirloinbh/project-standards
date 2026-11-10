# #456 Translate the central repo README and docs to English

Follows #454 (English writing rules). The README, every living doc under `docs/`, and the generators of the generated docs are now in English.

## How it was done

Six Sonnet subagents translated disjoint file groups in parallel (design and stack docs; user steps and tools; directory, design system, UI, conventions; ADRs and rule docs; research; README, runbooks, and generators). The main session then fixed cross-file links, markers, and tests.

## Changes

| Files | Change |
|---|---|
| `README.md`, `docs/*.md`, `docs/adr/`, `docs/conventions/`, `docs/research/`, `docs/runbooks/` | Translated to English |
| `scripts/gen-docs.mjs`, `scripts/lib/compliance.mjs`, `scripts/compliance.mjs`, `scripts/lib/repo-settings.mjs`, `design/tokens.json` | Generator text and token descriptions in English; `docs/projects.md`, `docs/versions.md`, `docs/design-tokens.md` regenerated; `docs/compliance.md`, `docs/env-matrix.md` updated to the new format |
| `scripts/test/` (compliance, gen-docs, repo-settings, test-config) | Assertions follow the English output |
| `AGENTS.md`, `docs/design.md`, `docs/layout.md` | Links to Korean heading anchors updated |

## Decisions

- Not translated: `docs/changes/`, `docs/daily/` (history logs) and `docs/bootstrap-prompt.md` (the user's original requirements).
- Korean kept where it is data: strings the code or apps still print or match (the sync commit prefix, the compliance commit title, the `- 배포 실행:` release marker, current app UI strings and error messages, the `원` currency suffix), registry domain names, real file and folder names, and old label names. Each has an English gloss where it appears in prose.
- Rules in the docs now say UI text, validation and error messages, emoji `alt`, and on-screen dates are English. The app templates and apps still use Korean until #455 and #457.
- The user-step marker is `[User]` everywhere (was `[사용자]`).
- `AGENTS.md` body stays Korean for now; it is restructured and translated with #448 / #455.

## Verification

- `npm test`: 523 tests, 505 pass, 7 fail (the same `deploy-templates.test.mjs` failures as on unchanged `origin/main` on this Windows PC; CI runs on Linux), the rest skipped.
- `registry:check`, `docs:check`, `tokens:check`, `packages:check`, `workflows:check`, `secrets:check`: pass.
- No links to Korean heading anchors remain outside `docs/changes/` and `docs/daily/`.
