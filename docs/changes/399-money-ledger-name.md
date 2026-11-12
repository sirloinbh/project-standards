# #399 Put mock investing in the money-ledger registry name and summary

## Why

The scope of money-ledger was set as three areas: household ledger, asset portfolio, and mock investing, and the name inside the app was changed to `가계부·자산·모의투자` (Household ledger, assets, mock investing) in sirloinbh/money-ledger#65. `manifest.webmanifest`, `offline.html`, and `AGENTS.md`, which are made from registry values, cannot be fixed in the app, so their names differed.

## Change

The Korean values are the actual registry values, so they are kept as they were, with English glosses.

| Field | Before | After |
|---|---|---|
| `title`, `displayName` | 가계부·자산 포트폴리오 (Household ledger, asset portfolio) | 가계부·자산·모의투자 (Household ledger, assets, mock investing) |
| `domain` | 가계부 (Household ledger) | 재무 (Finance) |
| First sentence of `summary` | 수입과 지출, 자산 포트폴리오를 기록하고 흐름을 확인하는 개인 서비스. (A personal service to record income, expenses, and an asset portfolio and check the flow.) | 수입과 지출, 자산 포트폴리오를 기록해 흐름을 확인하고, 모의투자로 투자 판단을 연습하는 개인 서비스. (A personal service to record income, expenses, and an asset portfolio to check the flow, and to practice investment decisions with mock investing.) |

- `domain` is kept as one word like the other apps, but set to `재무` (Finance), which covers all three areas. It is used only in the `docs/projects.md` table.
- Regenerated `docs/projects.md`. The list of files downstream repos receive is the same, so the snapshot did not change.

## Checks

- `npm run sync:preview`: the new name appears in money-ledger's `frontend/public/manifest.webmanifest`, `frontend/public/offline.html`, and `AGENTS.md`, and the old name remains nowhere in the preview
- `UPDATE_SNAPSHOT=1 npm test`: 517 passed, no snapshot change
- `npm run check`: passed

## Remaining work

- Review the money-ledger sync PR that opens after the merge and record it on this issue. Check in that PR that `npm run standards:check` passes. The user merges it.
