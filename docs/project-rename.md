# Renaming an app project

This is the order for changing the name (repo name, display name, DB name) of an app registered in the registry. It was first used for english-study → cert-manager (#347).

## What does not change

- The slot and ports. Ports are tied to the slot and have nothing to do with the name.
- The GitHub App installation and the repo secrets and variables. GitHub treats a renamed repo as the same repo.
- Past records (`docs/changes/`, daily records, survey documents, earlier tables). They reflect the state at that time, so they are not edited.

## Order

Central sync checks that the target repo is `sirloinbh/<repos.umbrella>` (`scripts/lib/registry.mjs`). So steps 2 and 3 are done at the same time. If the registry is merged first, sync fails looking for a repo that does not exist yet, and if the repo is renamed first, sync fails with the old name.

1. In the app repo, decide the new name, display name, description, and DB name, and record them in an issue. Make sure the repo name and DB name do not collide with other apps in the registry.
2. In this repo, open a PR that changes the name values. In the PR body's "Check before merging", write that step 3 is done, and do not merge before step 3 is finished.
   - `registry/projects.json`: `name`, `title`, `displayName`, `domain`, `summary`, `repos`, `db`, `skills`
   - `sync.config.json`: `repo`, `project`
   - Generated docs (`npm run docs`), the sync snapshot (`UPDATE_SNAPSHOT=1 npm test`)
   - Tests that contain the name and docs that state current values (the `docs/design.md` table, `docs/tools.md`, `docs/github-app.md`, `docs/user-steps.md`, `docs/costs.md`)
3. `[User]` On GitHub, rename the umbrella repo and the 3 sub-repos. Merge the PR from step 2 right after.
4. Check the sync PR that is open in the repo with the new name. The DB name in `AGENTS.md`, `deploy/`, and `compose.yaml` must change to the new value and `standards-check` must pass. The user merges this PR.
5. `[User]` Update the local remote URL, the folder name, and the local DB (`.env`, Docker volume) to match the new name.
6. Change the names that the app repo manages (package name, UI text, own skills, README) with an app repo issue.

## If the app is in production

The server's timer, lock, and backup folder names use the DB name as a prefix ([ADR-0009](adr/0009-multi-app-single-lightsail.md)). If the DB name changes, the server's systemd timer, the `/opt/<app>` path, the DB name, and the backup location must also be moved. This procedure has not been used yet. When renaming an app that is in production, design it first in an issue.
