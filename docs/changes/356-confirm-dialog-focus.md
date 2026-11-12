# #356 Fix focus being lost after closing a ConfirmDialog opened without a trigger

## Change

| File | Content |
|---|---|
| `templates/ui/frontend/src/components/ui/confirm-dialog.tsx` | Added the `returnFocusRef` prop |
| `templates/ui/frontend/src/components/ui/confirm-dialog.test.tsx` | Added cases for returning to the given place, keeping `trigger` behavior, and an empty ref |
| `docs/ui-components.md` | Added how to use it |

## Decisions

- It takes just one ref instead of passing `onCloseAutoFocus` through. The app only has to choose where to return to, and does not have to handle Radix events.
- If the ref is empty, the Radix default behavior is left as it is.
- After the sync, passing the place to return to into the question box in cert-manager `frontend/src/exam-attempts.tsx` is done in that repo.

## Checks

- Copied the template files to a temporary folder and ran `vitest` with the packages already installed in cert-manager. Nothing was installed.
- It was not checked in a real app screen or browser. The app CI runs on the sync PR.
