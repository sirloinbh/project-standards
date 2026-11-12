# #277 Unify app repo labels with the central standard labels

## Decision (user, 2026-10-27)

- Add the standard labels according to the mapping table, and **delete the existing labels that are in the mapping table.**
- Issues without a priority label get P3, as the std-backlog rule says. workout-memo is an exception: its 27 open issues are ranked by the confirmed work order in #122.
  - P1: #98 #99 #100 #104 #123 (UI foundation, bugs to handle first)
  - P2: #101 #102 #103 #105 #124 #125 (screen replacement, mobile input)
  - P3: #108 #114–#117 #122 (app packaging decision, cardio, tracking card)
  - P4: #106 #107 #109–#111 #118–#121 #139 (app conversion tied to the domain that was postponed, record import, docs)

## Change

| File | Content |
|---|---|
| `tools/labels.mjs` | `plan` (read-only mapping table), `apply` (add standard labels after confirmation), `--overrides`, `--keep-unlabeled`, `--remove-old` (adds to closed issues first, then deletes; does not delete in a repo that failed) |
| `scripts/test/labels.test.mjs` | 5 tests with a fake gh |
| `docs/tools.md` | Usage |

## Result of the run

| Repo | Open issues | Exactly one standard priority |
|---|---|---|
| file-control | 38 | 38 |
| plan-routine | 11 | 11 |
| study-log | 23 | 23 |
| workout-memo | 29 | 29 |
| shared-aws-infrastructure | 2 | 2 (already standard) |

- We also added the standard labels that match the old labels to 64 closed issues.
- Old labels deleted:
  - file-control: `P0 긴급`, `P1 높음`, `P2 보통`, `P3 낮음`, `enhancement` (Korean priority names: urgent, high, normal, low)
  - plan-routine: `P0 선행 필수`, `P1 높음`, `P2 보통`, `P3 매우 후순위`, `documentation`, `enhancement` (required first, high, normal, very low priority)
  - study-log: `우선순위: P0` to `P3` (priority: P0 to P3), `documentation`, `enhancement`
  - workout-memo: `priority:P0` to `P3`
- In the first run, one issue, workout-memo#110, failed with a GitHub 502, so we stopped without deleting the old labels in workout-memo. We ran it again to finish.
- Labels that are not in the mapping table, such as `특성: 안전` (trait: safe), `기능: 루틴` (feature: routine), `작업: UI` (task: UI), `epic`, and `추적` (tracking), were left as they were.
- The std-backlog skill in the app repos is the same as the central source, so there is nothing to fix. The old label names remain in `plan-routine/docs/next-steps/README.md`.

## Verification

- `node --test scripts/test/labels.test.mjs`: 5 passed
