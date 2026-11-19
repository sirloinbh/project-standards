# 789: the service deploy wrapper updates to origin/main again

After #767 `deploy/deploy.sh` in `shared-auth` and `shared-ai` is a wrapper around the shared `remote-deploy.sh`. It only deployed the checked-out commit, but the service READMEs say `bash deploy/deploy.sh` updates and restarts, so a manual run (and the first install, then later updates) would silently redeploy the old commit.

- `templates/service/deploy/deploy.sh.tmpl`: without `--no-pull` it runs `git fetch -q origin` and `git merge -q --ff-only origin/main` first, like the hand-written script did. With `--no-pull` (an autodeploy copy that started before the update) it deploys the current checkout.
- `scripts/test/service-deploy-templates.test.mjs`: the text, and a run in a temporary git clone that shows `--no-pull` deploys the old commit and the default deploys the new one.

Only the two service repos receive this file (their next sync PR); apps are unaffected. Verified with `npm run check` and the wrapper test; no server run.
