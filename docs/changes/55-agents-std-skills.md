# #55 Extract the common part of AGENTS.md and the common skills (std-*)

## Change

| File | Content |
|---|---|
| `templates/app/AGENTS.md.tmpl`, `CLAUDE.md.tmpl` | Common app instructions. The title, description, repository, ports, and DB name are filled in from the registry. The first paragraph makes the reader read `AGENTS.project.md`, and if the two files differ, `AGENTS.project.md` takes priority |
| `templates/common/skills/std-implementation/` | The procedure issue, branch, implementation and docs, tests and PR, merge. Linked with std-backlog and std-git-writing, and who merges follows each repo's AGENTS.md |
| `templates/app/skills/std-testing/`, `std-foundation/` | Test and development foundation skills for app repos |
| `templates/index.json` | A mirror rule that copies `skills/` to `.claude/skills/` |
| `scripts/lib/templates.mjs` | Mirror handling |
| `scripts/lib/vars.mjs` | Per-target template variables (`project`, `versions`, `platform`, `target`) |
| `registry/projects.json`, schema, `docs/projects.md` | Added the project `title` (Korean name) and `summary` (service description) |
| `scripts/test/agents.test.mjs` | Renders all 9 targets: AGENTS and CLAUDE content, the 5 skills and their copies, frontmatter and header checks |

## Comparison results

- **7 apps:** AGENTS.md differs only in the title, one line of service description, and the ports. The 3 skills differ only in one title line. So I made them common directly with template variables.
- **workout-memo:** in addition to the common content, it has exercise-domain rules, installed test tools, the contract and OpenAPI procedure, and local agent operation. It is split as in the table below.

### workout-memo AGENTS.md classification table

| workout-memo content | Class | Where to move it |
|---|---|---|
| Implementation work procedure 1–5, questions and research do not create issues | Common | `AGENTS.md` |
| Ports, date and time zone, server validation and transactions, no `.env` or state, stage only the needed files, reconfirm npm installs, no direct subtree push | Common | `AGENTS.md` (ports use registry values) |
| `ghp`, Codex account B (`CODEX_HOME`), auth document | Specific, later common | `AGENTS.project.md`, made common after #19 (tools centralization) |
| React Router, TanStack Query, RHF, Tailwind, `components/ui` | Specific, later common | `AGENTS.project.md`, made common after the design system (#120–#126) |
| Weight in kg (including default weight), NULL for an unconfirmed default weight | Specific | `AGENTS.project.md` |
| Skill list, daily and next-steps record rules | Common | `AGENTS.md` (as std-* skills) |
| `docs/design-system.md` rules | Specific, later common | `AGENTS.project.md`, made common after #77 and #123 |
| Unit test tools (node:test, Vitest), Playwright e2e, `db:migrate`, `contract:sync`, API route and OpenAPI procedure | Specific | `AGENTS.project.md` |
| Infrastructure (`terraform`) verification and deployment | Remove | Moved out of workout-memo in #94 |
| npm adoption procedure (`references/procedures.md`) | Specific | Kept in the `workout-foundation` project-specific skill |
| Local agent work (queue, worker, model table) | Specific | `AGENTS.project.md`, to be decided based on the #38 research result |

### Skills

| Existing skill | Handling |
|---|---|
| `<project>-implementation`, `-testing`, `-foundation` of the 7 apps | Same content as std-*, so delete them in each app's pre-cleanup (#99) and empty the registry `skills` |
| `workout-implementation` | Same as std-implementation, so delete |
| `workout-testing` | Reduced to a project-specific skill keeping only the installed test tools, pixel comparison, and contract-based test data rules |
| `workout-foundation` | Reduced to a project-specific skill keeping only `references/stack.md`, `procedures.md`, and the exercise-domain rules |

This handling is carried out in the workout-memo pre-cleanup (#95) and the other apps' pre-cleanup (#99).

## Rules decided

- The `AGENTS.md` and `CLAUDE.md` templates are also stored as `.tmpl`, because Codex and Claude Code read the AGENTS.md and CLAUDE.md in subfolders as real instructions.
- std-implementation is common to app and infra, so it does not use project variables (`project.*`) and uses only the target repo name (`target.repo`).

## Checks

- `npm run check`: 54 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- I rendered all 9 targets and confirmed there are no undefined template variables. The renderer fails if even one variable is missing.
- While writing, I found and fixed a problem where `sirloinbh/{{target.repo}}` in std-implementation rendered as `sirloinbh/sirloinbh/…`. A test checks the `sirloinbh/study-log` form.
