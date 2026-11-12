# #242 Repeated UI and shared code in the frontends of the 8 apps

The survey results and candidates for sharing are in [docs/research/ui-survey.md](../research/ui-survey.md). No code was changed.

## How it was checked

- Compared the `frontend/src` file lists on `origin/main` of the 8 app repos, and read the screen code of the 3 apps that have feature screens with `git show`.
- For repeated elements, counted the patterns (`confirm(`, `role="status"`, `<button>` and `<Button>`, `fetch(`, `type="date"`, `Skeleton` and `Spinner`) and read the matching places directly to confirm.
- Compared the shared component list with [ui-components.md](../ui-components.md).
