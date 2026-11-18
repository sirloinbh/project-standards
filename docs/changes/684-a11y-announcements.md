# #684 Fix screen reader announcements in Notice and Drawer

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/notice.tsx` | `Notice` renders two live regions (`role="status"` and `role="alert"`) that are always mounted and empty until there is a message, so the first message is announced. The root element is now a `div` (was a `p`) holding the two `p` elements; `data-slot="notice"` and `data-kind` stay on the root |
| `templates/ui/frontend/src/components/ui/drawer.tsx` | `DrawerContent` renders a visible close button like Dialog; `showCloseButton={false}` removes it |
| `notice.test.tsx`, `drawer.test.tsx` | The regions exist before the first notice and keep the same elements; the built-in close button closes the drawer |

## Notes

- Apps that wrap `Notice` in a `<p>` or select it as a `p` should check their markup. Apps with their own mounted status element can drop it.
- An existing drawer that renders its own "Close" button now has two; pass `showCloseButton={false}` there or remove the extra one.
- The Vitest cases pass in a scratch copy (Vitest 5.0.3, jsdom) using an app repo's installed packages; the central check does not run Vitest.
