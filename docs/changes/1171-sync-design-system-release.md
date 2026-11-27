# #1171 Deliver design-system releases to the apps through the central sync

Epic #1156, delivery model A ([ADR-0031](../adr/0031-design-system-repository.md)).

## Change

| File | Content |
|---|---|
| `versions.json`, `versions.schema.json` | New key `design-system`: `{ repo, version, sha }`. `version: null` (today) means no release exists, so sync keeps reading `templates/ui/` |
| `scripts/lib/design-system.mjs` | `resolveDesignSystem` clones tag `v<version>` once per tag into `.local/design-system/<version>`, checks that it points at `sha`, and checks that the release has `delivery/ui/`. `externalFolders` maps the feature folder to the release |
| `scripts/lib/templates.mjs`, `scripts/lib/sync-plan.mjs` | A feature folder in `external` is read from the release; the managed header still names `templates/<folder>/`, so file content is byte-identical |
| `scripts/sync.mjs` | `sync:preview` and `--apply` resolve the pin before planning; a bad pin fails the run before any PR is touched |
| `scripts/test/design-system-delivery.test.mjs` | Fixture release repository: fallback, missing pin, missing sha, missing tag, moved tag, missing folder, cache reuse, same files as `templates/ui`, ui feature off |

## Release contract (for #1173 and the move cards)

- Tag `v<major>.<minor>.<patch>` on `sirloinbh/design-system`; `versions.json` records the tag's commit in `sha` so a moved tag fails the sync instead of changing the apps.
- The release holds `delivery/ui/` with the same layout as `templates/ui/` today (`frontend/src/...`, `.tmpl` files rendered with the per-app variables). Stories and showcase files never go in `delivery/`.
- The repository is public, so the clone needs no token. A cached copy is reused after its commit is checked again.

## Not changed

- Apps receive the same files with the same hashes. Only the `source` note in the manifest of delivered files changes (`design-system/delivery/ui/...`) once a release is pinned.
- `templates/ui/` stays until #1170 removes it, after the first release is pinned.

## Checks

`node --test scripts/test/design-system-delivery.test.mjs`, `npm run docs`, `npm run check`: passed.
