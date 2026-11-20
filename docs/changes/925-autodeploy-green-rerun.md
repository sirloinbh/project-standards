# Autodeploy retries a commit whose CI turned green (#925)

- `templates/deploy/deploy/autodeploy.sh.tmpl`: when CI of a commit is red, the run writes `.autodeploy-failed` and also `.autodeploy-ci-failed` (the same sha). While the commit is still main, every run reads its CI state again: still red keeps waiting ("CI of <sha> is still red; waiting for a green re-run or a new commit on main"); green clears both marks and deploys ("CI of <sha> is green now; deploying"). A newer commit was already picked up on its own.
- A failed deploy and a rollback write only `.autodeploy-failed`, which still waits for a new commit: the same commit would fail the same way. No manual `rm` is needed after a CI re-run (money-ledger, 2026-11-21).
- Cost: one GitHub API read per run for a commit with red CI, the same as a commit waiting for CI.
- `scripts/test/autodeploy-journal.test.mjs`: red then red then green deploys and clears both marks; a mark without `.autodeploy-ci-failed` stays even when CI is green. Run in a Linux container because the test needs `flock`.
- `docs/runbooks/deploy.md`: the `rm` line says when it is still needed.
