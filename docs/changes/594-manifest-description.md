# #594 Short user-facing description in the app manifest

## Change

| File | Content |
|---|---|
| `registry/projects.schema.json` | New required project field `tagline`: one user-facing sentence, 10 to 120 characters |
| `registry/projects.json` | A `tagline` for each of the 8 apps |
| `templates/app/frontend/public/manifest.webmanifest.tmpl` | `description` is `{{project.tagline}}` instead of `{{project.summary}}` |
| `scripts/test/pwa.test.mjs` | Each app's manifest description is its tagline and has no internal notes (`me`, `login`, `exposure`) |
| `docs/pwa.md`, `docs/project-rename.md` | Mention the new field |

## Why

The manifest description was the internal project summary ("There is one user (me) and no login. Before any public exposure ..."). Browser install dialogs and app stores show it, and workout-memo is about to build an Android TWA with PWABuilder (workout-memo#110), which reads the manifest. `summary` stays the AGENTS.md text for agents.

## Verification

- `npm run check`: recorded in the PR.
- After sync: workout-memo `frontend/public/manifest.webmanifest` has the one-sentence description.
