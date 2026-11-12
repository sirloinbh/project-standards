# #74 Operations procedure documents (GitHub App guide, README)

## Change

| File | Content |
|---|---|
| `docs/github-app.md` | Procedures to create the sync App, register the private key, install it, allow downstream repos to call the central CI, verify it works, rotate the key, and change permissions. Steps the user must do themselves are marked [user] |
| `docs/adr/0002-github-app-for-sync.md` | Added **read** access for Administration, Secrets, and Variables to the permissions (the compliance status checks only settings and secret names). Issues write is added with label sync (#40) |
| `README.md` | Current status, command table, adding a new project, changing a rule, and what to do when standards-check fails in a downstream repo |

## Checks

- Only documents changed. `npm run check` passed (73 tests, registry-check, docs check).
- I checked that the relative links in the documents point to real files (PR body below).
