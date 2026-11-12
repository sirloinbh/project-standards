# #82 Compliance report (compliance.md, env-matrix.md)

## Change

| File | Content |
|---|---|
| `scripts/lib/compliance.mjs` | Collects per-repo status (comparing manifest managed files, shared package versions, open sync PRs and their age in days), parses `.env.example` (`@desc @required @secret @used`), cross-checks against the registry, and renders the two reports |
| `scripts/lib/remote-repo.mjs` | Reads default branch files through the API (no clone) |
| `scripts/compliance.mjs` | `--local <repo>=<path>` previews with a local clone. `--apply` reads the 9 repos with the App and opens or updates a `chore/compliance-report` PR in the central repo only when the report changed |
| `.github/workflows/compliance.yml` | Runs daily at 00:00 KST and manually. Skipped if there is no App |
| `docs/compliance.md`, `docs/env-matrix.md` | The first report, made from 8 local clones |
| `scripts/test/compliance.test.mjs` | 7 tests |

## Protecting secret values

- `@secret` keys are shown as `(비밀)` (secret) instead of the value.
- An existing `.env.example` without tags is judged by key name. Keys containing `PASSWORD`, `SECRET`, `TOKEN`, `KEY`, or `DATABASE_URL` are treated as secrets.
- A test confirms that password values appear nowhere in the two reports. In the first report too, I confirmed that the existing example password value (`change-this…`) does not appear.

## First report results (based on local clones)

- All 8 apps have not been synced yet (no manifest).
- In all 8 apps, the `PORT` and the `DATABASE_URL` port in `.env.example` differ from the new port scheme. They are fixed in the port reassignment (#95, #99).
- shared-aws-infrastructure has no local clone, so it is shown as "확인 못 함" (could not check).

## Left out of scope

- Collecting `npm audit` results is not included. It is a command that must query the registry over the network, so it needs a separate decision.
- The report PR is created by the App, so the central CI runs. Merging works like a normal PR.

## Checks

- `npm run check`: 117 tests passed, `check-workflows: ok (8 files)`
- On the first run, a test found a real bug. A repo that "could not be checked" has no problem list, so building the "other places" section of the report failed. It is fixed.
