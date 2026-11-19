# #782 Make the shared contract opt-in and tighten idSchema

Implements [ADR-0026](../adr/0026-contract-is-opt-in.md) (#693) for the central side, and the `idSchema` part of [ADR-0025](../adr/0025-ids-numbers-checked-int8-parser.md).

| File | Change |
|---|---|
| `scripts/scaffold.mjs` | `shared/contract.ts` and its two copies are written only when the project's `features.contract` is on |
| `scaffold/app/shared/contract.ts` | `idSchema` accepts a number or a string of 1 to 15 digits (`^[1-9]\d{0,14}$`, the `parseId` pattern) and returns a number. It rejects `"1e3"`, `"0x10"`, `true`, `"0"`, `"007"` and ids above 15 digits. Checked with a real `zod` v4 (life-journal's) |
| `templates/app/scripts/contract.mjs` and its test | With no `shared/contract.ts` both commands print a note and exit 0, so `contract:check` in `npm run check` keeps passing in an app without a contract. The test no longer reads `shared/contract.ts` |
| `registry/projects.schema.json` | `features.contract` is described (off for new apps) |
| `scaffold/app/AGENTS.project.md`, `docs/directory-rules.md` | The contract is described as opt-in |
| `scripts/test/scaffold.test.mjs` | Tests: contract off gives no contract files and still passes `standards-check` and `contract.mjs`; contract on gives the copies; the `idSchema` pattern equals `ID_PATTERN` |

## Decisions

- The `contract:sync`/`contract:check` scripts and `scripts/contract.mjs` stay managed in every app and become no-ops without a contract. That means removing the stub from an app (#783) does not need a sync or package.json script change, only the files, the knip ignores and the `zod` dependency.
- The 8 apps' registry values are not changed here: the 6 stub apps are set to `false` in their own #783 PR.
- `templates/app/knip.json` still lists the three contract files in `ignore`. For an app without them knip may print a configuration hint; hints do not fail knip. Not run with a real knip here.

## Checks

`npm run check` result is in the PR. The sync snapshot is unchanged.
