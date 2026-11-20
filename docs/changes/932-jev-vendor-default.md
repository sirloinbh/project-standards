# #932 The Jev helper calls the vendor API by default

The key in SSM (`/sirloinbh/shared/jev-api-key`, #573) is a TypeSafe AI key, but the e2e helper only called an API when `JEV_API_URL` was also set, and its built-in model name was OpenRouter's `typesafe/jev`. The #572 accuracy run needed three variables. Now the key alone records.

## Change

| File | Content |
|---|---|
| `templates/e2e/e2e/support/jev.ts` | `DEFAULT_API_URL` (`https://api.typesafe.ai/v1/systemone`) and `DEFAULT_MODEL` (`jev-latest`); `JEV_API_KEY` alone turns on recording; `JEV_API_URL` / `JEV_MODEL` stay as overrides |
| `scripts/test/e2e-jev.test.mjs` | The default model; a URL without a key never calls; the key alone calls the vendor route with `jev-latest`; the OpenRouter overrides are used when set |
| `docs/test-config.md`, `docs/adr/0028-e2e-jev-judge.md` | The new default and the overrides; the model is in the request hash, so fixtures are per route |

## Impact

- The model is part of the request hash, so a fixture recorded with `typesafe/jev` would not replay now. No app has a fixture yet (workout-memo's pilot is #933), so nothing is lost.
- Apps get the new `e2e/support/jev.ts` through their sync PRs.

## Checks

- `node --test scripts/test/e2e-jev.test.mjs`: 9 pass.
- LANES rule 11: the new `jev.ts` copied into a clean workout-memo clone: `npm run lint` passed, Prettier check passed, `tsc -p e2e/tsconfig.json` passed; the clone was restored.
- `npm run check`: see the PR.
