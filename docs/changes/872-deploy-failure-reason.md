# #872 Send the reason with the deploy failure signal

When a deploy failed, autodeploy sent only `deploy of <sha> failed` to healthchecks.io. The first workout-memo deploy with the root-context image (2026-11-20) failed at the migration step with `ENOENT scandir '/app/database/migrations/'`, and finding that needed someone to read journalctl on the server.

## Change

- `templates/deploy/deploy/autodeploy.sh.tmpl`: the deploy output (stdout and stderr) is also written to `.last-deploy.log`, overwritten by each run. On failure the fail signal carries the last 20 lines, after masking `...TOKEN=`, `...SECRET=`, `...PASSWORD=` and `...KEY=` values with `***`. The deploy scripts do not print such values; the mask is a second guard. The exit code and `.autodeploy-failed` behave as before (`pipefail` keeps the deploy's status through `tee`).
- `scripts/test/autodeploy-journal.test.mjs`: runs the rendered script with a fake `curl` (CI passed) and a failing `remote-deploy.sh`; checks the log file, the signal body, the masking and `.autodeploy-failed`. Needs `flock` and `python3`: skipped in Git Bash on Windows (run through WSL here), runs in CI.
- `scripts/test/deploy-templates.test.mjs`: the signal string check follows the new message.

`notify.sh` keeps the first 10 KB of the body, so 20 lines fit.
