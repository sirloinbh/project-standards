# Bring the user-steps status table up to date (#860)

`docs/user-steps.md` still showed the 2026-10-23 "Not done" statuses. Rows 1, 3 to 11 and 14 now say Done with the date their issue closed (all of #21, #86, #88, #22, #40, #180, #183, #261, #266, #286 and #245 are closed; the GitHub App variable `SYNC_APP_ID` exists and sync PRs open). Rows 0, 15 and 16 are local PC state and keep their last known status. The "recommended order 1 → 3 → 4" paragraph and the "what the agent does next" table are replaced by a pointer to the `needs-user` issues.

Verification: `npm run check:docs`.
