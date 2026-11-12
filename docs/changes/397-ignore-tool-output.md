# #397 Add tool output folders to the central repo .gitignore

## Change

| File | Content |
|---|---|
| `.gitignore` | Added `.bkit/` and `.playwright-mcp/` |

## The 8 apps

The `templates/common/.gitignore.tmpl` that apps receive already has both folders. I confirmed that the `.gitignore` of the 8 apps also has them, so no separate sync PR is needed.

## Checks

- `git check-ignore`: both folders are ignored
- `npm run check`: passed
