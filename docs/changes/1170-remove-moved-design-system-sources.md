# #1170 Remove the moved design-system sources from project-standards

Epic #1155, delivery model A ([ADR-0031](../adr/0031-design-system-repository.md)). project-standards no longer holds a copy of the design system; it pins a release (`versions.json` `design-system`, v1.0.2) and delivers it.

## Change

| Removed | Now lives in |
|---|---|
| `templates/ui/` except `sign-in.tsx` and the service worker files (#1208) | `delivery/ui/` of the pinned design-system release |
| `design/tokens.json`, `packages/design-tokens/`, `scripts/build-tokens.mjs`, `npm run tokens` and `tokens:check` | design-system `tokens/`, `packages/design-tokens/` |
| `docs/design-tokens.md` (was generated), now a pointer | design-system `docs/design-tokens.md` |
| Tests of the moved code: tokens, cn-text-styles, ui-kit-english, frontend-api, frontend-auth-origin, frontend-session-watch, compare-ui-kit (`scripts/compare-ui-kit.mjs`) | design-system `scripts/test/` |

| Changed | Content |
|---|---|
| `scripts/lib/registry.mjs` | `loadAll` data gets `designSystemRelease`, fetched on first use, so every plan and test renders the kit from the pinned release (cached in `.local/design-system/`) |
| `scripts/gen-docs.mjs`, `package.json` | No token doc, no token scripts in `check` |
| `scripts/test/*` | Plan tests read the kit from the release; the delivery test builds its fixture release from the pinned one |
| `AGENTS.md`, `docs/design.md`, `.claude/rules/sources-and-copies.md` | Pointer edits (coordinator approved) |

## Not changed

The file list the apps receive (`scripts/test/fixtures/sync-snapshot.json`) is unchanged: a full sync changes nothing in the apps. `@sirloinbh/design-tokens` stays in `versions.json` and the packages list; only its source moved.

## Checks

`npm run check`: passed.
