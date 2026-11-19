# #688 Add Textarea and NativeSelect to the UI kit

## Change

| File | Content |
|---|---|
| `components/ui/input-styles.ts` | New `fieldClasses`: the class list Input, Textarea and NativeSelect share. `input.tsx` uses it (same classes as before) |
| `components/ui/textarea.tsx` | New `Textarea`. `limit` adds a counter linked by `aria-describedby`; over the limit the counter says "N over the limit" and the field gets `aria-invalid`, so the state is not colour only. The limit is soft (no `maxlength`) |
| `components/ui/native-select.tsx` | New `NativeSelect`: the browser `<select>` in the Input look with a chevron |
| `textarea.test.tsx`, `native-select.test.tsx` | Tests for both |
| `docs/ui-components.md` | Rows for the three files; the `Notice` row now matches #684 |
| `scripts/test/fixtures/sync-snapshot.json` | The new managed files are in the synced list |

## Notes

- Files under `templates/ui/` are managed automatically, so no entry in `templates/index.json` is needed (the issue's task assumed a list; there is none), and `components/ui/` is already in the Prettier ignore list.
- Apps replace their copies (`form-fields.ts`, `labeled-textarea.tsx`) in later changes.
- The Vitest cases pass in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
