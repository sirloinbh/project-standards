# #682 Make requestJson reject bad bodies and support abort and forms

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/lib/api.ts` | A 2xx answer with an empty or non-JSON body now rejects with `RequestError` (kind `body`, status kept). `requestJson` takes `signal`, `timeoutMs` (default 30 s, 0 disables) and `headers`. New `requestForm` for multipart uploads. `RequestError` has a `kind`: `network`, `timeout`, `abort`, `http`, `body` |
| `templates/ui/frontend/src/lib/api.test.ts` | Added cases for non-JSON 2xx, empty 2xx, abort, timeout, headers and multipart |
| `scripts/test/frontend-api.test.mjs` | Same cases for the central Node test of the template (the fetch init now carries a `signal`) |

## Notes

- `fetch` now always receives a `signal`. Apps that assert on the exact `fetch` init in their tests need to allow it.
- An empty non-204 2xx body used to resolve as `{}`; apps that relied on that must answer 204 or a JSON body.
