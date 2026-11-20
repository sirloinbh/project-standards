# Format the scaffold api healthcheck like prettier (#894)

- `scaffold/app/compose.yaml`: the one-line `healthcheck.test` array is now written the way `prettier --write` formats it (a block `test:` with one item per line). An app that copied the one-line form failed its `format:check` in CI (health-log#232 first run).
- `scripts/test/scaffold.test.mjs`: the #875 test matches the new shape.
- Found while adopting the healthcheck in health-log and life-journal for #894.
