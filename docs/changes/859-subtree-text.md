# Remove the subtree and sub-lockfile text from the design docs (#859)

ADR-0022 dropped the subtree sub-repos and the `frontend/` and `backend/` lockfiles. These docs still described them:

- `docs/design.md`: removed the "Subtree repo names" and "Downstream lockfiles" rows (the latter linked to a heading that no longer exists), dropped `lockfiles:sync`, rewrote step 3 of 6.6, and marked 9.1 as history.
- `docs/directory-rules.md`: removed the "subtree →" tree comments and the sub-lockfiles from the tree.
- `docs/conventions/database.md`, `docs/project-rename.md`: one repo per app.

Verification: `npm run check:docs`.
