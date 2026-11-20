# #863 Validate templates/index.json

## Change

| File | Content |
|---|---|
| `scripts/lib/index-check.mjs` | `indexErrors(index, sync, projectsSchema)`: vendor entries (`profiles` are profiles of `sync.config.json`, `repos` are sync targets whose profile is in `profiles`, no unknown keys), `dependencyFields.profiles`, `dependencyFields.onlyWith` (file in `dependencyFields.files`, `<section>.<package>` field, feature in the registry schema) and `fields` profile names |
| `scripts/registry-check.mjs` | Runs it after the registry checks, so `npm run registry:check` and `npm run check` fail with the file and the bad value |
| `scripts/test/index-check.test.mjs` | The real file passes; one bad value per key fails |

## Why

`loadIndex` is a bare `JSON.parse`. A misspelled profile, repository or feature (the keys added by #826 and #843) was ignored, and the sync PR just came out smaller.

## Checks

- `npm run check`: see the PR.
