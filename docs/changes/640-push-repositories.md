# #640 push-repositories no longer pushes the umbrella main

## Change

- `templates/app/scripts/push-repositories.ps1` splits each part without `--rejoin`, so the checked-out branch gets no new commits, and pushes `export/<part>` only to the matching sub-repo remote (`<part>:main`).
- The final `git push origin main` is removed.
- Before any split, the script checks that the remotes `frontend`, `backend` and `database` exist and throws a message with the `git remote add <part> https://github.com/sirloinbh/<repo>.git` command if one is missing.
- The temporary `export/<part>` branches are deleted at the end, also after a failure.
- `templates/app/AGENTS.md.tmpl`, `scaffold/app/README.md` and the script header say that the umbrella `main` changes only through PRs.
- `scripts/test/scripts-templates.test.mjs` checks the rendered script for all 8 apps.

## Why

- A direct push to `main` bypasses the PR, review and CI flow (#591).
- `--rejoin` adds commits to the current branch, so a later `git pull --ff-only` on `main` can fail.
- A clone without the sub-repo remotes failed midway with no clear message (reported by the workout-memo session, 2026-11-18).

## Verification

- `node --test scripts/test/scripts-templates.test.mjs`
- `npm run check`
