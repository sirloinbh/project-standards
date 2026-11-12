# #125 Baseline PWA setup so the web app can be installed like an app

## Change

| File | Content |
|---|---|
| `templates/app/frontend/public/manifest.webmanifest` | Registry name, `standalone`, light background color, 3 icons |
| `templates/app/frontend/public/sw.js` | Dependency-free service worker: pages go to the network (an offline notice page when offline), `/assets/` is cache-first, `/api/` is left alone, a new version replaces the old one right away and old caches are deleted |
| `templates/app/frontend/public/offline.html` | Offline notice page (light and dark) |
| `templates/app/frontend/nginx.conf` | `/assets/` 1 year immutable, `sw.js`, manifest, and pages `no-cache`. Security headers are repeated in every location that has `add_header` (nginx does not inherit them) |
| `templates/app/.prettierignore` | Added 3 new managed files (#154 rule) |
| `scripts/lib/pwa-icons.mjs`, `scripts/pwa-icons.mjs` | Draw and write 4 temporary icon PNGs using only Node built-in modules (the CLI for existing apps does not overwrite files that already exist) |
| `scaffold/app/frontend` | Manifest, icons, and `theme-color` in `index.html`, production-build service worker registration in `main.tsx`, `vite-env.d.ts`. The scaffold also creates the icons |
| `docs/pwa.md` | Structure, cache rules, icon specs, how to apply to existing apps, how to check |
| `scripts/test/pwa.test.mjs` | Manifests of the 8 apps, color and token match, service worker syntax and rules, nginx headers, PNG size and safe area |

## Verification

- `npm run check` passed.
- Built the virtual slot 99 scaffold with the workout-memo installation (`vite build`) and checked it in the installed Chrome (Playwright, persistent profile).
  - CDP `Page.getInstallabilityErrors`: no errors. `Page.getAppManifest`: no errors.
  - After going offline and navigating to another address, `offline.html` appears (its text "인터넷에 연결되어 있지 않습니다" means "You are not connected to the internet").
  - `eslint .` passed (after adding declarations for the service worker globals `self` and `caches`).
- Adding to the home screen on real devices (Android Chrome, iOS Safari) is for the user to confirm.
