# 808: the autodeploy journal says what it decided

After shared-auth sync PR #16 merged, the first autodeploy runs wrote nothing to the journal for a few minutes, so waiting looked the same as stuck. The server units do not hide output (no `StandardOutput` setting), so the silence was the script: the up-to-date exit and the busy-lock exit printed nothing, and the CI-pending line was easy to miss next to them.

- `deploy/autodeploy.sh` gets `say()`: one journal line when the decision changes and at most one repeat an hour, kept in `.autodeploy-log` (`<epoch> <last line>`). The timer fires every 2 minutes, so the journal does not fill. A damaged log file only causes one extra line.
- Visible now: `up to date at <sha>`, `waiting for CI of <sha> (deployed: <sha or none>)`, `another deploy holds the lock; trying again on the next run`, `<sha> failed before; waiting for a new commit on main`. `deployed <sha>` and `CI failed ...` were already printed.
- The fetched tip is read from `FETCH_HEAD` instead of `origin/main`, so a clone whose tracking ref is not updated by `git fetch origin main` still sees the new commit. (The shared-auth delay after #16 may have been CI timing; this removes one possible cause.)
- The `signal` calls to healthchecks.io are unchanged.
- Tests: `scripts/test/autodeploy-journal.test.mjs`. Rule 11 for the shared template: previewed with `npm run sync:preview`, copied into a clean study-log clone, `bash -n` and `npm run lint` passed, then `git checkout -- .`.
