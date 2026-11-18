# #683 Ship a managed server health hook

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/health.ts` | New `useHealth(retryMs)` built on `requestJson`: checks `/api/health` on mount, aborts on unmount, retries every 10 s (and on `online`) while the server is down. A proxy's HTML error page now shows the request's message instead of "Cannot reach the server". `healthText` omits the date when the answer has none |
| `templates/ui/frontend/src/health.test.ts` | Tests for ok, non-JSON error, network error, recovery, unmount abort |
| `scaffold/app/frontend/src/app.tsx`, `app.test.tsx` | The scaffold uses `useHealth` and `healthText` instead of its own react-query fetch; text is now the shared English text |
| `scripts/test/fixtures/sync-snapshot.json` | The new managed test file is in the list of synced files |

## Notes

- Depends on the `RequestError` kinds from #682.
- Apps replace their own `useHealth` copies with the managed one in their sync PR follow-ups.
