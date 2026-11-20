# Mark implemented ADRs as Accepted (#861)

ADR-0001 to 0006 and ADR-0013 said `Proposed` although the decisions run in production. Each now says `Accepted` and cites the issue that implemented it (or, for ADR-0013, the re-check in #517). ADR-0028 stays Proposed (waits for #573). ADR-0018 no longer calls `shared-ai` "planned".

Verification: `npm run check:docs`.
