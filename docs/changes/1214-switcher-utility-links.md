# 1214 file-control and develop-skill links in the app switcher

- `registry/projects.json` has a new top-level `switcherLinks` list (schema: `registry/projects.schema.json`, `name`, `label`, `href` with https only): file-control opens its repository page (its screen runs only on `127.0.0.1`), develop-skill opens `https://wiki.daysofme.com/`.
- `appsList` in `scripts/lib/vars.mjs` renders the links after the active apps, so each app's `lib/apps.ts` has 10 entries. It still returns an empty list while there is no root domain.
- Test: `scripts/test/app-switcher.test.mjs` checks the order and exact text of the last two entries.
- No design-system change: the existing `AppSwitcher` lists any `APPS` entry. A separator or an external-link mark for these two would be a design-system change and is not part of this card.
