# Architecture review (2026-11-18)

- **Scope:** macro-level review of `project-standards` (structure, dependencies, tool fit, unnecessary code, duplication, refactoring, efficiency), plus a cross-app comparison of the 8 apps' own code and dependency sets.
- **Reviewed commit:** the latest `origin/main` on 2026-11-18 (central `ebce6cd`; app manifests point at central `5c44996`). Exported snapshots without `.git` were read.
- **Not checked:** git history, live GitHub state (open sync PRs, CI run times, repo settings), the production server, `shared-auth`, `shared-ai`, `shared-aws-infrastructure`, and line-level bugs. Nothing was installed and no app test suite was run. Ratings: Impact high/medium/low, Effort S/M/L.

How the numbers were measured: line counts with `wc -l`; cross-app comparison with a small Node script that hashes every non-binary file per app after replacing the app's name, ports, and DB names with placeholders, and reads each app's `.standards/manifest.json` to know which files are centrally managed.

---

## Part 1. project-standards

Size of the repo (741 files):

| Area | Files | Lines | Note |
|---|---|---|---|
| `scripts/` (code, no tests) | 37 | 4,028 | largest file is `standards-check.mjs`, 299 lines |
| `scripts/test/` | 73 | 10,211 in `*.test.mjs` + 1,396-line snapshot | 588 test cases |
| `tools/` | 23 | 3,495 | `tools/agents/` is 2,266 lines; `cli.mjs` is 1,339 |
| `templates/` | 146 | 7,204 | `templates/ui` is 2,674 lines (1,006 are tests) |
| `scaffold/` | 39 | 1,404 | |
| `packages/` | 28 | about 950 without the font | 5 packages |
| `docs/` | 335 | 13,617 | 241 files in `docs/changes/` (6,026 lines) |

### 1. Overall structure

**1.1 The core sync model is sound and small. Keep it.** (no action)
- `scripts/sync.mjs` (178), `lib/sync-plan.mjs` (87), `lib/sync-pr.mjs` (230), `lib/templates.mjs` (113), `lib/render.mjs` (126), `lib/manifest.mjs` (60). About 800 lines implement render → plan → PR through the Git Data API with no clone.
- Three modes (`full`, `section`, `fields`) plus a manifest with hashes is close to the simplest design that still detects local edits. `templates/index.json` (33 lines) is the single place that says what is a section, a vendored file, a mirror, or a field.
- The split of pure planning (`planTarget`, no network) from the API step (`syncTarget`) makes the 1,396-line snapshot test possible. This is good design.

**1.2 The same skill and hook text is committed in three places in the central repo, and two places in every downstream repo.** Impact: medium. Effort: S.
- Source `templates/common/skills/std-*` (5 skills, 499 lines) → hand-made copy `.claude/skills/` → generated copy `plugins/sirloinbh-standards/skills/`. Hooks: `templates/common/.claude/hooks/*.mjs` (675 lines) → `.claude/hooks/` → `plugins/.../hooks/`. `block-package-installs.mjs` (439 lines) exists three times.
- `.claude/rules/sources-and-copies.md` tells the author to copy by hand "in the same PR". The plugin copy has a generator with `--check` (`scripts/build-plugin.mjs`); the `.claude/`, `.codex/`, `.github/` copies of this repo do not have a generator, only tests that compare them.
- Downstream, `templates/index.json` `mirror` writes every skill to both `skills/` and `.claude/skills/` (9 skills × 2 per app), and each app also carries `scripts/claude-skills.mjs` (67 lines, managed) plus `scripts/test/claude-skills.test.mjs` (60 lines, unmanaged, identical in 8 apps) to check its own project skills the same way.
- Recommendation: add one `npm run self` step (or extend `build-plugin.mjs`) that writes the central repo's own copies from the templates, with `--check` in `npm run check`. That removes the manual copy rule. ADR-0013 explains well why downstream copies stay as files; that decision is fine.

**1.3 `scaffold/` has fallen behind the apps it was the origin of.** Impact: medium. Effort: M.
- `scaffold/app/backend/src/migrations.ts` still has Korean error messages; the copies in health-log, life-journal, money-ledger, and plan-routine are in English and say "Copied from the project-standards scaffold".
- `scaffold/app/compose.yaml` has the `shared-ai` network, `IMAGE_TAG` image names, and `WEB_BIND`/`WEB_PORT`. Four of the 8 apps do not (see Part 2 drift table).
- The cause is structural: a scaffold file is copied once and never updated, so every improvement must be made 9 times. The files that are identical or nearly identical in the apps should be managed templates, and the scaffold should shrink to truly app-owned starters (`app.ts`, `app.tsx`, the first migration, `AGENTS.project.md`). See Part 2.

**1.4 `tools/` mixes three unrelated things.** Impact: low. Effort: S.
- PC account tools (`gh-project.ps1`, `install.ps1`, `set-credential-helper.ps1`), GitHub admin scripts (`labels.mjs`, `repos.mjs`, `project-board.mjs`, `dependency-prs.mjs`, `app-secrets.mjs`, 844 lines), and the agent worker (`tools/agents/`).
- All their tests live in `scripts/test/`. `package.json` `test:agents` lists 11 test files by name instead of a glob, so a new `agent-*.test.mjs` is easy to miss on the Windows job. Use `scripts/test/agent-*.test.mjs`.

### 2. Dependency choices

**2.1 The zero-dependency policy pays off in the central repo.** (no action)
- `scripts/lib/schema.mjs` is 96 lines and rejects unknown keywords loudly. `scripts/lib/github-app.mjs` is 99 lines (JWT with `node:crypto`). CI needs no `npm ci`, no lockfile, and no cache, and the vendored `.standards/*.mjs` files run in downstream CI before install (`ioc-scan` runs before `npm ci`). A dependency would not make this smaller.
- TypeScript templates are tested by importing the `.ts` file directly with Node's type stripping (`scripts/test/backend-http.test.mjs`, `backend-jobs.test.mjs`). That is an idiomatic use of Node 24.

**2.2 The policy does cost a lot in the guard hooks.** Impact: medium. Effort: M.
- `templates/common/.claude/hooks/block-package-installs.mjs` is 439 lines: a hand-written shell splitter (`splitCommands`, lines 62–170), PowerShell `-Command` and `Start-Process` handling, `xargs`, and the full npm 11 command list with typo aliases (`isntall`, `verison`). `block-forbidden-commands.mjs` adds 206 lines. `.codex/rules/package-installs.rules` lists every npm prefix by hand ("clean-install-t", "clean-install-te", ...).
- The file's own header says "a guard against mistakes, not a security boundary". Since #629 app repos may run `npm install --ignore-scripts`, so the blocked set is now narrower than the parser.
- The tests for the two hooks are 426 lines. The same 675 lines are copied into 11 repos and the plugin.
- Recommendation: do not add a parser dependency. Shrink the scope instead: keep the `permissions.deny` prefix rules plus a short hook that checks the first word of each `;`/`&&`/`|` segment for `npx` and `npm` with a handful of subcommands. Accept that `sh -c "npm i"` passes. Target: under 120 lines.

**2.3 The largest hand-written parser is in the apps, not in the central repo: a Zod → JSON Schema converter in 8 copies.** Impact: high. Effort: M.
- Every app's `backend/src/openapi.ts` contains its own `jsonSchema()` (85–93 lines each) that reads Zod internals (`schema._zod.def`, `check._zod.def`), plus an Express route walker. The 8 files total 3,359 lines; 123 lines are identical in all 8.
- Zod 4.6.7 (the pinned version in `versions.json`) ships `z.toJSONSchema()`. `docs/research/zod4.md` line 41 already notes this and option C in that doc ("rewrite OpenAPI generation with `z.toJSONSchema()`") is on hold.
- The apps are now on the Zod 4 API, so the hold reason is gone. Move the converter and route walker into one managed file (`backend/src/standard/openapi.ts`, built on `z.toJSONSchema`) and leave only the per-app operation table in each app. This removes private-API coupling in 8 places and about 150 lines per app.

**2.4 Shared package design and versioning are fine; one gap.** Impact: low. Effort: S.
- 5 packages, all with 0 dependencies, exact peer versions, tag-based publish with provenance check in sync (`verifyPackages`, ADR-0004). This is careful and proportionate.
- Gap: four root dev dependencies are in all 8 apps but not in `versions.json`: `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0, `@lhci/cli`, `concurrently` 9.2.5. `@playwright/test` must match `versions.json` `images.playwright` (v1.63.0), yet nothing ties them. `docs/dependency-policy.md` line 15 still lists Playwright as a "workout-memo only" package. `frontend` `zod` 4.6.7 is also in all 8 apps and unmanaged. `@lhci/cli` has already drifted (0.16.0 in 6 apps, 0.16.1 in health-log and life-journal).

### 3. Tool fit

**3.1 `node:test`, type stripping, reusable workflows: idiomatic.** (no action)
- One reusable workflow per profile, pinned by the commit that last changed it (`lastWorkflowCommit` in `sync.mjs`), so a docs-only central commit does not change every app's `ci.yml`. Good detail.
- `scripts/lib/inline-ci.mjs` (74 lines) expands the reusable workflow for public repos with line-based text handling. It is a hack, but it is small, tested, and forced by a real GitHub limit (#209).

**3.2 The "DB migration" shell block is duplicated inside `reusable-app-ci.yml` and kept equal by a test.** Impact: low. Effort: S.
- Lines 75–92 and 145–158 are the same 14-line script; a test asserts they match. Move it to a vendored script (`.standards/ci-migrate.sh` or a `.mjs`), which the sync already delivers and which also works in the inlined public-repo copy.
- The same block has a "no runner" fallback (`::warning` and psql twice). Once every app has the managed runner (Part 2, M1), the fallback and the warning can go.

**3.3 Each app keeps three lockfiles because of the subtree repos, and the central repo carries the code to reconcile them.** Impact: medium. Effort: L (needs a user decision).
- `scripts/lib/lockfiles.mjs` (205) + `scripts/lockfiles.mjs` (61) + `lockfiles.test.mjs` (149) rebuild `frontend/package-lock.json` and `backend/package-lock.json` from the root lockfile, and `sync-pr.mjs` `PACKAGE_FILES` edits all of them. The Dockerfiles build from `./backend` and `./frontend` with the sub-lockfile, while CI installs from the root lockfile (#303).
- The only consumers of the sub-lockfiles are the Docker build contexts and the three subtree repos per app (`push-repositories.ps1`). Each app also holds `frontend/.github/workflows/ci.yml` and `backend/.github/workflows/ci.yml` for those subtree repos. These 16 files are unmanaged and stale: `actions/checkout@v4`, `ubuntu-latest`, `npm ci` with no `NODE_AUTH_TOKEN` and no `--ignore-scripts`, and `docker build` with no `npm_token` secret. With the managed `.npmrc` they cannot install `@sirloinbh/*` packages as written.
- Question for the user: do the 24 subtree repos still have a purpose? The server deploys from the umbrella repo (`deploy/remote-deploy.sh` runs `docker compose build` in the umbrella checkout). If they have none, drop the subtree repos, the 16 sub-CI files, `push-repositories.ps1`, and build Docker images from the repo root with the root lockfile. That deletes the lockfile reconciler and its downstream copy (`.standards/lib/lockfiles.mjs`) too.

### 4. Unnecessary code

**4.1 Rollout-era migration code is still live after the rollout finished (#116).** Impact: medium. Effort: S.
- `scripts/lib/pin-ranges.mjs` (38) and `pinPackageFiles` in `sync-pr.mjs` (about 45 lines) pin `^`/`~` ranges and edit lockfiles. The dependency scan of all 24 app `package.json` files found zero range versions. The code runs on every sync for nothing, and editing lockfile JSON from a bot is the riskiest part of the sync.
- `OLD_COMMIT_PREFIX` (Korean bot commit prefix, `sync-pr.mjs` line 15) is needed only while a pre-#455 sync PR is still open.
- `maxRollout` and per-target `rollout` (`sync.config.json`, schema, `sync.mjs`, `gen-docs.mjs`): `maxRollout` is 3 and every target is ≤ 3. An `enabled: false` flag per target would cover the only remaining use (adding a new repo carefully).
- `docs/design.md` is still headed "Status: draft (issue #1)" and describes the 9-target, 4-package, phase-0-to-7 world. `tools/install.ps1` and `docs/tools.md` still carry the `gh-workout-memo` old location and "until it is deleted in #167".
- Recommendation: one cleanup PR. Replace the pinning with a `standards-check` rule "no range versions" (cheap, and it keeps the guarantee).

**4.2 `tools/agents/` is 2,266 lines of code and 3,287 lines of tests for a worker that one repo is configured for.** Impact: medium. Effort: S to decide, M to act.
- Only `workout-memo` has `.agents.json`. `docs/tools.md` still says the workout-memo switchover "happens in #167". The 11 daily notes in `docs/daily/` do not mention the worker. AGENTS.md now describes interactive agents doing the review-and-merge loop themselves (#128, #591).
- The agent tests are 32% of all central test lines (3,287 of 10,211), run on every `npm run check`, and have their own Windows workflow.
- Recommendation: decide. If the Codex worker is no longer the way work gets done, move `tools/agents/` and its tests to an archive branch or its own repo. If it stays, split `cli.mjs` (see 6).

**4.3 Process volume is high for one developer, but most of it is cheap; the expensive part is per-change documents.** Impact: low. Effort: S.
- `docs/changes/` has 241 files (6,026 lines) in under a month, one per issue, on top of the issue, the PR body, and the daily note. The same facts are written three or four times. Consider making the change record optional for changes whose PR body already holds the verification results.

### 5. Duplication

| Where | Evidence | Impact / Effort |
|---|---|---|
| Skill and hook copies (central ×3, downstream ×2) | see 1.2 | medium / S |
| CI migration block ×2 | `reusable-app-ci.yml` 75–92, 145–158 | low / S |
| Workflow boilerplate | the 3-line `setup-node` block with the same `package-manager-cache: false` comment appears in `ci.yml` (×2), `sync.yml`, `agents.yml`, `compliance.yml`; `sync.yml` re-runs the whole `npm run check` that `ci.yml` already runs on the same push | low / S |
| `walk()` directory helpers | `scripts/lib/templates.mjs`, `build-plugin.mjs`, `secret-scan.mjs`, `ioc-scan.mjs` each have one. The vendored scripts must stay standalone, so only the non-vendored ones can share. Fine as is | none |
| App-side duplication | far larger than anything inside the central repo. See Part 2 | high |

`scripts/` itself has little duplication. Shared logic is already in `scripts/lib/`.

### 6. Refactoring plan (ordered)

1. **Delete rollout leftovers** (4.1): `pin-ranges.mjs`, `pinPackageFiles`, `OLD_COMMIT_PREFIX`, `maxRollout`/`rollout`; add a "no range versions" check; refresh `docs/design.md` status. Payoff: about 150 lines and the lockfile-editing bot path gone. Effort S.
2. **Generate the central repo's own copies** (1.2). Payoff: no hand copies, one fewer rule. Effort S.
3. **Promote the shared app files to managed templates** (Part 2, M1–M6), in this order: migration runner → rate limit → identical small files → OpenAPI helper → test helper. Each one is one central PR plus 8 sync PRs. Payoff: fixes two real defects (Part 2, D1, D2) and removes about 250–300 lines per app. Effort M each.
4. **Shrink the install hook** (2.2). Payoff: about 300 lines × 12 copies. Effort M.
5. **Decide on `tools/agents/`** (4.2). If kept, split `tools/agents/cli.mjs` (1,339 lines, 48.8 KB, one line is 741 characters long):
   - `prompts.mjs`: the role instructions and prompt text now inline in `agent()` (lines 246–416).
   - `stages/verification.mjs` (584–687), `stages/delivery.mjs` (701–790), `stages/ci.mjs` (791–916), `diagnose.mjs` (417–566).
   - `context.mjs`: the module-level state built at import time (lines 30–71: `root`, `home`, `repoConfig`, `startupError`). Today these are globals, so the stages cannot be tested without spawning the CLI; passing a context object fixes that.
   - `cli.mjs` keeps `main()` and argument parsing (959–1339).
6. **Decide on the subtree repos** (3.3). Payoff if dropped: 3 lockfiles → 1 per app, about 415 lines of reconciler code and tests, 16 stale workflow files, 24 repos. Effort L.

### 7. Efficiency

- **`npm run check`:** eight sequential npm scripts; the first runs all 73 test files. Measured once on this Windows PC from the snapshot: `node --test scripts/test/*.test.mjs` took 205 s wall time. The 11 `agent-*.test.mjs` files alone took 30 s (204 tests). The numbers are approximate: the snapshot has no `.git`, so a few tests that call git failed early. Linux CI is likely faster, and per-file times were not collected. Three and a half minutes before every commit is real friction for a docs-only change. Next step: run once with `--test-reporter=spec` to find the slow files (candidates are the ones that spawn processes or render every profile for every target: `deploy-templates.test.mjs`, the hook tests, `scaffold.test.mjs`), then add a fast `npm run check:docs` for PRs that touch only `docs/`.
- **Every PR commit runs CI twice.** `templates/app/.github/workflows/ci.yml.tmpl` (and the inlined public version in `inline-ci.mjs`) use `on: [push, pull_request]`. A push to a PR branch in the same repo fires both events, so each sync PR and each agent PR runs verify + e2e + docker-build two times. Change to `push: { branches: [main] }` plus `pull_request`, as the central `ci.yml` already does. Impact: medium (halves app CI minutes). Effort: S.
- **Sync fan-out:** well controlled. `syncTarget` returns `unchanged` when only `centralSha` moved (`sync-pr.mjs`, "Only the central SHA in the manifest changed"), and CI callers pin to the last workflow-changing commit. A docs-only merge opens no PRs. A template change opens up to 11 PRs, each running the app CI (verify + e2e + docker-build, each with its own `npm ci`).
- **Cost driver:** the number of central merges that touch templates. Today's notes show a feature split into three central PRs (#654, #655, #656) with "8 sync PRs" for one of them. Each round is 8 PR reviews by an agent plus 8 CI runs plus, for app repos, 8 production deploys. Batching related template changes into one central PR is the biggest token and CI saving available without any code change.
- **App CI:** `verify`, `e2e`, and `docker-build` each install from scratch. `docker-build` builds both images on every push even when only docs changed. A `paths-ignore: ['docs/**', '**/*.md']` on the caller would skip full CI for the many docs-only app PRs. Effort S.
- **Agent context cost:** each app repo gets 9 skills twice, 4 rule files, a 200-line `.claude/settings.json`, and 675 lines of hooks. Only skill descriptions load eagerly, so this is acceptable. `std-code-review` (147 lines) and `std-backlog` (138) are the long ones.

### What is done well

- Plan/apply separation with a snapshot test for "which files does each repo receive".
- Detect-and-guide only (ADR-0003), never auto-revert; a sync PR with human commits is left alone and reported (#367).
- Supply-chain care that is real, not decorative: Actions pinned by SHA from `versions.json`, `ignore-scripts`, BuildKit secret for the token, provenance check for own packages, IOC scan before install.
- A port and DB-name registry with a formula and conflict checks. Zero port conflicts across 8 apps.
- ADRs that record the rejected option and a "revisit when" condition (ADR-0013, ADR-0020).
- The dependency matrix result (Part 2) shows the `fields` mode works: 42 shared dependencies are at the same exact version in all 8 apps.

---

## Part 2. Cross-app comparison (8 apps)

Totals: 1,678 distinct relative paths across the 8 apps. 157 are centrally managed (`full`). Of the 1,521 unmanaged paths, 60 exist in 6 or more apps. Those 60 are the table below.

### 2.1 Identical or near-identical modules that are not managed

"Variants" = number of different contents after replacing name, ports, and DB names.

| # | File(s) | Apps | Variants | Lines | Where it should live |
|---|---|---|---|---|---|
| M1 | `backend/src/migrations.ts`, `backend/src/migrate.ts` | 6 (missing in cert-manager, dev-career-portfolio) | 6 and 6 | about 110 + 35 | Managed: `templates/app/backend/src/standard/migrations.ts` and `migrate.ts`. Same algorithm everywhere; the differences are comments, message wording, `Client` vs `Pool`, a different advisory lock key per app (581_003 vs 581_012), and study-log lacking `--status` |
| M2 | Rate limit setup: `backend/src/rate-limit.ts` (3 apps) or inline in `app.ts` (3 apps); none in workout-memo and plan-routine | 6 | 5 | about 20 | Managed: `backend/src/standard/rate-limit.ts`; add `express-rate-limit` to `versions.json` |
| M3 | Zod → JSON Schema converter and route walker inside `backend/src/openapi.ts` | 8 | 8 | 85–93 (converter) of 282–589 | Managed: `backend/src/standard/openapi.ts` built on `z.toJSONSchema()`; apps keep the operation table. `openapi-cli.ts` (8–11 lines, 3 variants) becomes managed too |
| M4 | `backend/test/helpers.ts` (`withApi`, listen on a port that `fetch` accepts) | 7 | 7 | 51–162 | Managed test helper `backend/test/standard/api.ts`. Two different fixes for the same "bad port" problem exist: a refused-ports list (cert-manager) and "retry until port > 10080" (plan-routine) |
| M5 | Fully identical in all 8: `scripts/contract.mjs` (38), `scripts/test/contract.test.mjs` (31), `scripts/test/claude-skills.test.mjs` (60), `e2e/tsconfig.json`, `backend/tsconfig.check.json`, `frontend/tsconfig.build.json`, `frontend/src/vite-env.d.ts`, `backend/.dockerignore`, `frontend/.dockerignore`, `backend/.gitignore`, `frontend/.gitignore`, `database/.gitignore` | 8 | 1 | 2–60 | Managed (`full`) templates. Zero risk: they are already byte-equal after normalization |
| M6 | `e2e/smoke.spec.ts` (7 apps, 2 variants), `frontend/src/main.tsx` (2 variants), `frontend/vite.config.ts` (same content, differs only in ports and formatting), `frontend/index.html`, `frontend/src/test/setup.ts` (5 variants, 23 of about 28 lines common) | 7–8 | 2–8 | 9–33 | `vite.config.ts` and `main.tsx`: managed templates with port variables. `setup.ts`: managed base `test/standard-setup.ts` that the app's own `setup.ts` imports. `index.html`, `smoke.spec.ts`: leave in the scaffold |
| M7 | `compose.yaml` | 8 | 8 | 45–64 | Keep app-owned (env vars differ for real), but check the contract in `standards-check` (see D2). Average line similarity is 71% |
| M8 | `frontend/.github/workflows/ci.yml`, `backend/.github/workflows/ci.yml` (subtree repo CI) | 8 | 2 | 15 | Delete, or manage. See Part 1, 3.3 |
| M9 | `shared/contract.ts` + generated copies `frontend/src/contract.ts`, `backend/src/contract.ts` | 8 | 4 | 8 lines in 6 apps, 26 in money-ledger, 561 in workout-memo | The copy mechanism (M5 scripts) is carried by 6 apps whose contract is an 8-line stub. Either use it or switch `features.contract` off for those apps |

Not candidates (checked and rejected): `backend/src/app.ts` (14 common lines of 49–168, real app wiring), `frontend/src/app.tsx`, `README.md`, `AGENTS.project.md`, `database/README.md`, `.env.example`, `backend/test/db.integration.test.ts` (23 to 1,464 lines, different content under one name).

Small helpers that appeared twice under the same name with different content (watch, do not act yet): `backend/src/dates.ts` (study-log, health-log), `backend/src/validation.ts` (study-log, cert-manager), `frontend/src/use-load.ts` and `form-fields.ts` (cert-manager, dev-career-portfolio), `frontend/src/service-date.ts` (plan-routine, dev-career-portfolio) while `serviceDate` also exists in the managed `backend/src/standard/http.ts` and again inline in `life-journal/backend/src/app.ts`.

### 2.2 Drift table

| # | Topic | State across the 8 apps | Why it matters | Impact / Effort |
|---|---|---|---|---|
| D1 | Migration runner | cert-manager and dev-career-portfolio have no `backend/src/migrate.ts` and no `db:migrate` script. The managed `deploy/remote-deploy.sh` (line 120 of the template) runs `node dist/migrate.js` in every app | A deploy of those two apps with the synced script stops at the migrate step. In CI they fall into the psql-only branch with a warning | high / S after M1 |
| D1b | Root `db:migrate` script | study-log has the runner in `backend/package.json` but no root `db:migrate`. The CI step tests the root `package.json` | study-log's runner is never exercised in CI; it also gets the psql-only warning | medium / S |
| D2 | `compose.yaml` deploy contract | `remote-deploy.sh` header requires images tagged `<db>-backend:${IMAGE_TAG}` and web port `${WEB_BIND}:${WEB_PORT}`. life-journal, money-ledger, cert-manager, dev-career-portfolio have neither. plan-routine has `IMAGE_TAG` and one `WEB_PORT`. `standards-check.mjs` checks only ports and the build secret | Rollback to the previous image tag cannot work in those 4 apps; the health check reads `WEB_PORT` from `.env` while compose publishes a fixed port | high / S (add 2 regex checks, fix 4 files) |
| D3 | `shared-ai` network in compose | workout-memo only; the scaffold has it for every new app | Expected for now (#611), but it is a manual edit in 7 repos later | low |
| D4 | DB health check | `-U $POSTGRES_USER` (single `$`, substituted by compose on the host) in workout-memo, health-log, life-journal; `$$POSTGRES_USER` in the other 5 and the scaffold | Same intent, two spellings; the single-`$` form depends on the host environment | low / S |
| D5 | Rate limiting | 5 variants: 600, 700, or 1,200 requests per minute; on all paths or only `/api`; before or after the body parser; three error message texts; none at all in workout-memo and plan-routine | Same problem solved 5 ways | medium / S after M2 |
| D6 | Advisory lock key in the migration runner | 581_003 in some apps, 581_012 in study-log | Harmless (separate databases) but shows the copies diverging | low |
| D7 | `pg` connection style | `new Pool` inline in `server.ts` in 6 apps; a `createPool` helper in life-journal (`pool.ts`) and study-log (`sql.ts`) | Two apps solved "a lost connection must reject the query" in their own helper; the other 6 did not get it | low / S |
| D8 | Backend layout | `backend/src/routes/` in 3 apps (workout-memo, cert-manager, dev-career-portfolio); `*-routes.ts` at top level in plan-routine; flat domain files in the other 4 | `docs/directory-rules.md` says `routes/`; only a warning | low |
| D9 | Test settings | money-ledger runs backend tests with `--test-concurrency=1`; study-log `dev` loads a second env file from `../../project-standards/.env` | App-specific, but the second one hard-codes a sibling checkout path | low |
| D10 | E2E depth | workout-memo has 12 spec files; the other 7 have the single `smoke.spec.ts`, yet all 8 run the full e2e CI job and carry Playwright, axe, and Lighthouse dev dependencies | 7 apps pay a full job for a 20-line smoke test | low |

### 2.3 Dependency and version matrix

Compared: the 3 `package.json` files of each app (24 files) against `versions.json`.

- **All 42 dependencies in `versions.json` and the 5 `@sirloinbh/*` packages are present at exactly the central version in all 8 apps.** No `^` or `~` range remains anywhere. The `fields` sync mode does its job.
- All shared scripts (`check`, `lint`, `typecheck`, `test`, `contract:*`, `skills:*`, `standards:check`, `openapi`, ...) have one body in all 8 apps. Only `check` differs in workout-memo (adds `test:docs`).

| Package | Scope | Apps | Versions | Note |
|---|---|---|---|---|
| `@playwright/test` | root dev | 8 | 1.63.0 | Not in `versions.json`; must match `images.playwright` v1.63.0 |
| `@axe-core/playwright` | root dev | 8 | 4.13.0 | Not in `versions.json` |
| `concurrently` | root dev | 8 | 9.2.5 | Not in `versions.json` |
| `@lhci/cli` | root dev | 8 | 0.16.0 (6 apps), 0.16.1 (health-log, life-journal) | Not in `versions.json`; drifted |
| `zod` | frontend | 8 | 4.6.7 | Managed for backend only |
| `express-rate-limit` | backend | 6 | 8.7.1 (4 apps), 8.7.2 (study-log, dev-career-portfolio) | Not in `versions.json`; drifted |
| `@testing-library/user-event` | frontend dev | 2 | 14.6.7 (workout-memo), 14.6.8 (dev-career-portfolio) | drifted |
| `recharts` | frontend | 2 | 3.10.1 | study-log, money-ledger; same version |
| Single-app packages | | 1 each | | `@anthropic-ai/sdk`, `@aws-sdk/client-s3`, `multer`, `pdfjs-dist`, `react-markdown` (study-log); `pg-boss` (money-ledger); `web-push`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `msw`, `tesseract.js`, `fflate`, `@garmin/fitsdk` (workout-memo) |

Recommendation: add the first six rows to `versions.json` `dependencies` (one central PR). Add an optional-dependency notion ("if present, must be this version") for packages used by some apps, such as `express-rate-limit`, `recharts`, and `@testing-library/user-event`.

---

## Top 10 recommendations (ordered by payoff over effort)

1. **Fix the deploy contract gaps now** (D1, D2). Add `standards-check` rules for `IMAGE_TAG`, `WEB_PORT`, and the presence of the `db:migrate` runner; fix compose in 4 apps; add the root `db:migrate` script to study-log. High / S.
2. **Make the migration runner a managed file** (M1) and give it to cert-manager and dev-career-portfolio. Then delete the "no runner" fallback in `reusable-app-ci.yml` and move the duplicated CI block to a vendored script. High / M.
3. **Manage the 12 files that are already identical in all 8 apps** (M5), plus `vite.config.ts` and `main.tsx` (M6). Medium / S.
4. **Put the 6 unmanaged-but-universal dependencies into `versions.json`** (2.3) and add "if present, this version" for partial ones. Medium / S.
5. **Delete rollout leftovers** in the central repo: range pinning and lockfile editing in sync, old commit prefix, `maxRollout`; refresh `docs/design.md`. Medium / S.
6. **Replace the 8 hand-written Zod → JSON Schema converters** with one managed helper on `z.toJSONSchema()` (M3). High / M.
7. **One managed rate-limit module and one managed backend test helper** (M2, M4). Medium / S each.
8. **Decide the fate of the subtree repos.** If they have no consumer, drop them, the 16 stale sub-CI files, the sub-lockfiles, and the lockfile reconciler. Medium-high / L, needs the user.
9. **Decide the fate of `tools/agents/`.** Archive it if interactive agents replaced it; otherwise split `cli.mjs` as in Part 1, section 6. Medium / S–M.
10. **Cut recurring cost:** stop the double CI run per PR commit (`on: [push, pull_request]`), skip app CI for docs-only changes, find the slow central tests (205 s locally), generate the central repo's own skill and hook copies, shrink `block-package-installs.mjs` to a short guard, and batch template changes into fewer central merges. Medium / S–M.
