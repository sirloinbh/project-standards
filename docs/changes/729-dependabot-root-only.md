# #729 (central part) Dependabot watches the root lockfile only

The apps have one lockfile since #770, so `templates/app/.github/dependabot.yml` lists `directory: /` instead of `/`, `/frontend` and `/backend`. The grouping into one minor/patch and one major security PR is unchanged. `scripts/test/dependabot.test.mjs` checks the new shape.

The per-app deletion of `frontend/.github`, `backend/.github` and the two sub-lockfiles follows in each app repo. Archiving the 24 sub-repos stays a user step.
