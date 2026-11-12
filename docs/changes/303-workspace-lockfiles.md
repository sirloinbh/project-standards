# #303 Check that workspace lockfiles match, and a command to regenerate them

## Change

| File | Content |
|---|---|
| `scripts/lib/lockfiles.mjs` | Lockfile dependency graph, comparison of workspace lockfiles, and generating workspace lockfiles from the root lockfile (Node built-in modules only) |
| `scripts/lockfiles.mjs` | Command: compare (without `--write`), rewrite (`--write`) |
| `scripts/standards-check.mjs` | Added the "workspace lockfiles" check |
| `templates/index.json` | Copies `.standards/lib/lockfiles.mjs` and `.standards/lockfiles.mjs`; adds a `lockfiles:sync` script field to the app root `package.json` |
| `scaffold/app/package.json.tmpl`, `scaffold/app/README.md` | The same script for new apps |
| `scripts/test/lockfiles.test.mjs`, `scripts/test/standards-check.test.mjs`, `scripts/test/templates.test.mjs` | Tests |
| `scripts/test/fixtures/sync-snapshot.json` | Added the two files to the 8 apps |
| `docs/dependency-policy.md`, `docs/design.md` | Usage and file classification |

## Decisions

- The comparison looks only at "installed versions". For each package name, it compares the set of versions installed in the workspace lockfile with the set of versions that workspace sees in the root lockfile. Differences in hoisting location are ignored.
- Optional peer dependencies (`peerDependenciesMeta.optional`) are not followed in the comparison. In the root lockfile, a package installed by another workspace (vite's optional peer `tsx`, installed by backend) is not found and dropped, which causes a false difference. When computing the `dev` and `optional` flags, they are followed as npm does.
- Bundled dependencies (`bundleDependencies`) are not followed. npm sometimes does not write them into the root lockfile, so when rewriting, the entries of the previous workspace lockfile are carried over.
- Rewriting does not download or install anything. It copies the root lockfile entries (`resolved`, `integrity`) as they are and recomputes only the location and flags. After rewriting, it runs the same comparison once more, and if a difference remains it stops without writing.
- Locations may differ from npm's (which version to hoist when there is a conflict). `npm ci` installs at the locations written in the lockfile, so the resulting versions are the same.

## Checks

- Checked with the lockfiles of the 8 apps (origin/main):
  - Comparison: only workout-memo `frontend/` differs, in 7 packages (`@asamuzakjp/css-color`, `@babel/runtime`, `tinybench`, `tldts`, `tldts-core`, `undici`, `whatwg-url`). The other 15 files have 0. This matches the #240 research.
  - Flag computation: all 16 workspace lockfiles match the `dev`, `optional`, and `devOptional` that npm wrote.
  - Rewriting: the 8 `backend/` files are byte-for-byte the same as the existing files. `frontend/` has the same versions and differs only in a few locations.
  - The files rewritten in workout-memo, study-log, and health-log were checked with `npm ls --package-lock-only --all --offline` (read-only, no download): all 6 have no problems.
- The result of `npm run check` is written in the PR.

## After it reaches the apps

- When the sync PR lands, `standards-check` in workout-memo CI fails on `frontend/package-lock.json`. Fix it in the same PR with `npm run lockfiles:sync` (no install).
