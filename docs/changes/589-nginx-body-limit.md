# #589 Request body limit for app API uploads

## Change

| File | Content |
|---|---|
| `templates/app/frontend/nginx.conf.tmpl` | `/api/` sets `client_max_body_size {{service.bodyLimit}};` |
| `scripts/lib/vars.mjs` | `service.bodyLimit` is `<service.apiBodyMb>m`, `1m` when the app sets nothing |
| `registry/projects.schema.json` | Optional `service.apiBodyMb` (integer MB, 1 to 100) |
| `registry/projects.json` | study-log sets `apiBodyMb: 21` (its API accepts 20 MiB uploads, study-log#28) |
| `scripts/test/docker.test.mjs` | study-log gets `21m`, other apps keep `1m` |

## Notes

- Only `/api/` changes; static files keep the default limit. Other apps render `1m`, the nginx default, so their behaviour does not change.
- 21 MB is a little above the API limit, so a larger upload gets the API's own 413 message, not nginx's.

## Verification

- `npm run check`: recorded in the PR body
- After the sync PR merges and study-log deploys, an upload of about 20 MB should reach the API (checked in study-log).
