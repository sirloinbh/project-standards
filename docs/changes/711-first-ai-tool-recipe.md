# #711 Recipe for the first AI tool of an app

Added [docs/conventions/first-ai-tool.md](../conventions/first-ai-tool.md): the checklist for the PR that gives an app its first AI tool (one read-only `list_<noun>` tool plus the `audit_log` migration, ADR-0024), based on workout-memo's tools and tests. It covers choosing the tool, the files in the app PR, the tests to copy, the live check through shared-ai with the audit row, and what not to do. The README rule-document list links it.

No code change. Check: `npm run check:docs`.
