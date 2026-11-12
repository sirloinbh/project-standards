# #304 Keep shared app dependency versions in versions.json and check them as managed fields

## Change

| File | Content |
|---|---|
| `versions.json`, `versions.schema.json` | `dependencies`: 37 external dependencies that the 8 apps and the scaffold use with the same file, section, and version (`root`, `frontend`, `backend`) |
| `templates/index.json` | `dependencyFields`: the setting that uses the values above as managed fields of the 3 app `package.json` files |
| `scripts/lib/templates.mjs` | `sharedDependencyFields`: expands them into managed fields, and stops if a name contains a dot or overlaps with `fields` |
| `scripts/gen-docs.mjs`, `docs/versions.md` | Generate the version table from `versions.json` |
| `docs/dependency-policy.md` | Replaced the hand-written version table with a pointer to `versions.md` and a table of packages used by only one app |
| `AGENTS.md`, `docs/design.md`, `docs/stack.md` | Pointers to the source location |
| `scripts/test/*` | Tests for managed fields, drift, and generated docs; added the shared dependencies to the existing fixtures |

## Decisions

- No new check is created; the existing managed fields (manifest `fields`) are used. So if only one app has a different version, `standards-check` fails with "managed fields differ" (the original message is in Korean), and when a version is raised centrally, the sync PR changes the app `package.json`.
- Only dependencies that all 8 apps and the scaffold (`scaffold/app/`) write in the same file and the same section are targets. `concurrently` is used by the 8 apps but not in the scaffold, so it was left out. `@sirloinbh/*` is already managed as `packages`.
- Managed field paths are split on dots (`devDependencies.vite`), so packages whose names contain a dot (such as `tesseract.js`) cannot be included. Including one stops rendering.
- If a sync PR changes versions in `package.json`, the lockfile stays as it is and `npm ci` fails. In a sync PR that raises versions, the user matches the lockfile with `npm install --ignore-scripts` and runs `npm run lockfiles:sync` (#303). This change carried over the current versions as they are, so no app versions change.

## Checks

- Compared the 3 `package.json` files of the 8 apps on `origin/main` with the 37 fields: all match
- The result of `npm run check` is written in the PR
