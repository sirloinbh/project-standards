# standards-check warns when an app does not use a managed helper (#906)

- `scripts/standards-check.mjs` gets `ADOPTION_RULES` and `checkAdoption(sources, managed)`. Each rule says which managed file offers the helper (`managedFile`), which repo-owned file must use it (`ownedFile`), whether it applies (`applies`: the managed file exists in this repo and the owned file is present) and how to check it (`check`, returns warning texts). The warnings go with the other API warnings and do not fail the check.
- First rules: `listen-host` (`backend/src/server.ts` must call `listenHost(`, #866, #898); `create-pool` (`server.ts`, `pool.ts` or `db.ts` that call `new Pool(` must also call `createPool(`, ADR-0025; one-off import/export scripts are not asked); `tool-routes` (an app with `backend/src/ai-tools.ts` must call `registerToolRoutes(` with `requireBinding: true` in `app.ts` and pass `AI_TOOLS_PUBLIC_KEY` in `server.ts`).
- The compose api healthcheck warning (#875) stays where it is.
- To add a rule: add an entry to `ADOPTION_RULES` and a passing and a failing case to `scripts/test/standards-check.test.mjs`. The test "the export names each helper" lists the ids, so a new rule needs a conscious test change.
- Warnings first. Turn `listen-host` into a problem once all 8 apps have adopted it (#898).
- Run on the 8 app clones before merging: it names the apps that still pass a literal host (workout-memo, money-ledger, cert-manager in the clones used) and none for the others.
