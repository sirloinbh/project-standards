# #681 Keep job queue policies and retry rate-limited jobs

## Change

- `templates/jobs/backend/src/standard/jobs.ts`: `startJobs` compares an existing queue's policy (`getQueue(name).policy`) with the policy in the code and throws `Queue "x" already exists with policy "standard", but the code asks for "singleton"...` instead of silently dropping the policy. pg-boss cannot change a policy, so a mismatched queue lost the guarantee the code relied on (money-ledger's price fetch uses `singleton`).
- `isNonRetryable` no longer treats `408`, `425` and `429` as final; they are retried with backoff like a 5xx.
- `scripts/test/backend-jobs.test.mjs`: both cases. `docs/jobs.md`: the non-retryable rule.

## Reason

Code review 2026-11-18 (2 Medium).

## Impact

- An app whose queue already exists with another policy now fails at start with the instruction to use a new queue name. Fixing that is a decision per app (rename the queue or drop the old one by hand); none of the 8 apps is known to be in that state.

## Verification

- `node --test scripts/test/backend-jobs.test.mjs`: 26 pass. `npm run check`: see the PR.
