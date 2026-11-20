# #864 ioc-scan reads every node_modules and survives folders in .github/workflows

## Change

| File | Content |
|---|---|
| `scripts/ioc-scan.mjs` | Installed-package install scripts are read from every `node_modules` (root, each workspace's, and the ones nested inside packages). The workflows check reads files only, so a subfolder no longer throws `EISDIR` |
| `scripts/test/ioc-scan.test.mjs` | Workspace, scoped and nested `node_modules` findings; a folder next to a workflow file |

## Why

A package npm could not hoist lands in `backend/node_modules` or `frontend/node_modules`, and its `postinstall` was never read. An empty `.github/workflows/sub/` made the whole scan exit 2.

## Checks

- The 8 app clones pass the new scan.
- `npm run check`: see the PR.
