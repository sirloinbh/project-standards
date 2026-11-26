# #1147 Remove Korean from the UI kit and guard it

A comment in `date-field.tsx` quoted the Korean browser date labels. The Hangul guard tests in life-journal and dev-career-portfolio scan `components/ui/`, so their wave 2 sync PRs failed and the sync stopped.

| File | Change |
|---|---|
| `templates/ui/frontend/src/components/ui/date-field.tsx` | The comment is English |
| `scripts/test/ui-kit-english.test.mjs` | New: no file under `templates/ui/` contains Hangul, comments included |

Decision: the apps' guard tests stay strict (they also catch a kit regression in the app's own CI). Checked with `npm run check`.
