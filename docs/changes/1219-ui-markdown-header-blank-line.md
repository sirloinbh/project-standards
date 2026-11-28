# #1219 Blank line after the managed header in delivered UI kit Markdown

Part of #1219 (the design-system part is design-system#71). The v1.0.0 sync PR in workout-memo failed `prettier --check` on `frontend/src/components/markdown/markdown.md`: the sync put the managed header comment directly above `# Markdown`, and Prettier wants a blank line there.

## Changes — 2026-11-28

- `scripts/lib/render.mjs` (`addHeader`): a Markdown file whose header source is under `templates/ui/` and whose first line is not blank gets a blank line after the header. Other Markdown files keep the old layout, because the apps do not run Prettier on them (they are listed in the app `.prettierignore`), so no other managed file changes.
- `scripts/test/render.test.mjs`: tests for both cases.
