# #871 Report a failed GitHub API call in autodeploy

`autodeploy.sh` read the CI state with `state=$(curl -fsS ... | ci_state)`. Under `set -euo pipefail` a failed request (the unauthenticated API allows 60 calls an hour per server IP, or the network is down) ended the run at once: no journal line, no healthchecks.io signal, and the unit counted as failed, which looked like a broken deploy.

## Change

- `templates/deploy/deploy/autodeploy.sh.tmpl`: the request has a 30 second limit. When it fails or returns nothing, the run says `could not read the CI state of <sha> from GitHub; trying again on the next run`, sends `signal fail` with the same text, and exits 0. The commit is not marked failed, so the next run (2 minutes later) tries again. The python traceback of an empty answer is dropped.
- `scripts/test/autodeploy-journal.test.mjs`: runs the rendered script against a local bare repository with a fake `curl` (HTTP 403 exit, empty answer) and checks the journal line, the signal, exit 0 and that `.autodeploy-failed` is not written. It needs `flock` and `python3`, so it runs on Linux (CI) and is skipped in Git Bash on Windows; checked once through WSL.

Not done: an optional GitHub token header. A server `.env` token is a user step; the retry already covers a short rate-limit window.
