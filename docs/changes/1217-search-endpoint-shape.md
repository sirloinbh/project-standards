# 1217 Content search endpoint shape

- `docs/directory-rules.md` (API standards) has a new section "Content search `GET /api/search`": `?q=` (1 to 100 characters), response `{ "results": SearchResult[] }` with the design-system `SearchResult` (`title`, `href`, `kind: 'content'`, optional `snippet`), word matching like `matchesQuery`, at most 20 newest-first results, owner-only behind the shared sign-in and rate limit, listed in OpenAPI, with API and screen tests.
- The shape follows the existing rule that lists are wrapped in a name. No choice for the user: it only fixes one value per field the dialog already defines.
- The 8 app cards follow under #1217.
