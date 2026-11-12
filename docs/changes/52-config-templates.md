# #52 App and common config file templates

## Change

| File | Content |
|---|---|
| `templates/common/.editorconfig.tmpl`, `.gitattributes.tmpl`, `.gitignore.tmpl` | Files that are the same in the 8 apps. The study-log current files as is. For `.gitignore`, I added a `# --- project ---` line at the end to make it section-managed |
| `templates/app/.prettierignore.tmpl` | study-log as is + the project section marker line |
| `templates/app/.nvmrc.tmpl`, `.node-version.tmpl` | `{{versions.node}}` |
| `templates/app/.npmrc.tmpl`, `frontend/.npmrc.tmpl`, `backend/.npmrc.tmpl` | Added `ignore-scripts=true` to `engine-strict` and `save-exact`. frontend and backend get the same settings because the Docker build runs `npm ci` in each folder |
| `templates/app/.github/dependabot.yml` | Turns off version-update PRs for 3 npm locations and GitHub Actions (`open-pull-requests-limit: 0`), and uses only security updates |
| `templates/index.json` | The list of section-managed files and the managed fields of 3 `package.json` locations (`packageManager`, `engines.node`, `engines.npm`) |
| `scripts/lib/templates.mjs` | Collects templates from the profile folders (strips `.tmpl`, checks path conflicts across folders) and renders per target |
| `scripts/test/templates.test.mjs`, `scripts/test/fixtures/study-log/` | 9 tests that compare against the study-log current files |

## Rules decided

- **`.tmpl` suffix:** config files that Git, npm, and editors read automatically are stored with `.tmpl` at the end of the template name, and the suffix is removed when rendering. For example, if a file named `templates/common/.gitignore` existed, Git in the central repo would actually apply its ignore rules in that folder. For the same reason, the test baseline files are stored as `.txt`.
- **Scope adjustment (moved to #65):**
  - The ESLint, Prettier, and tsconfig entry files load the packages that #65 will create, so they are created after the package format is decided.
  - The package registry line in `.npmrc` (`${NODE_AUTH_TOKEN}`) makes every npm command fail if that environment variable is missing. So it is applied at the sync (#97) where the packages actually start to be used.
- **Parts deliberately different from study-log:** two things, `ignore-scripts=true` in `.npmrc` and the section marker line. The tests confirm that everything else matches the study-log current files.
- **Dependabot security updates:** they must be turned on separately in the repo settings. The repo settings baseline is handled in #22.

## Checks

- `npm run check`: 49 tests passed, `registry-check: ok`, `docs/projects.md: up to date`
- On the first run, 1 test failed. The header of `frontend/.npmrc` correctly points to its own folder (`templates/app/frontend/`), but the test wrongly expected it to match the root `.npmrc` including the header. I fixed the test to compare the contents without the header.
