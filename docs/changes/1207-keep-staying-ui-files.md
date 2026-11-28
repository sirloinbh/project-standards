# #1207 Keep the ui files that stay in project-standards when a release is pinned

Epic #1156. `collectTemplates` replaced the whole `templates/ui` folder with the release's `delivery/ui/`. The files that do not move to design-system (`sign-in.tsx`, `service-worker.ts`, `service-worker.test.tsx`, the STAYS list of `scripts/compare-ui-kit.mjs`) would have disappeared from every app on the first pin.

## Change

| File | Content |
|---|---|
| `scripts/lib/templates.mjs` | For a delivered folder, files of `templates/<folder>/` that the release does not provide are still delivered. The release wins on the same path |
| `scripts/test/design-system-delivery.test.mjs` | A release next to a local-only file and a file in both |

## Notes

Until #1170 removes the moved sources, a file deleted from the release also stays delivered from `templates/ui`. After #1170 `templates/ui` holds only the STAYS files.
