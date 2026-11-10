# Installing the Web App (PWA)

The default setup that lets the 8 apps be installed on a phone's home screen and opened like an app (#125). No external packages (such as vite-plugin-pwa) are used. To adopt a plugin, go through the procedure in the [dependency policy](dependency-policy.md) and get user confirmation.

## Structure

| File (app repo) | Managed by | Content |
|---|---|---|
| `frontend/public/manifest.webmanifest` | Central (fully managed) | The name is the registry `displayName` and the short name is `title`. `display: standalone`, start URL `/`, light background color `#ffffff` (ADR-0008). Apps with `features.darkOnly` use the dark background `#0a0a0a` (ADR-0011) |
| `frontend/public/sw.js` | Central (fully managed) | Service worker. See the cache rules below |
| `frontend/public/offline.html` | Central (fully managed) | Offline notice screen. Light and dark modes. Apps with `features.darkOnly` are dark regardless of the system setting (ADR-0011, #363) |
| `frontend/nginx.conf` | Central (fully managed) | Cache headers |
| `frontend/public/icons/*.png` | App | Icons. Initially a shared placeholder icon |
| `frontend/index.html` | App | manifest and icon links, `theme-color`, `viewport-fit=cover` |
| `frontend/src/main.tsx` | App | Service worker registration (production build only) |

## Cache rules (sw.js)

- **Screens (page navigation):** Always fetched from the network. When there is no connection, `offline.html` is shown. Pages are not cached, so stale data is never shown.
- **`/assets/` (build files, with a content hash in the name):** Cache first.
- **`/api/`, non-GET requests, other origins:** The service worker does not get involved.
- **Updates:** nginx serves `sw.js` as `no-cache`, so the browser checks for a new version every time. A new version is installed on the next visit and replaces the old one immediately (`skipWaiting`, `clients.claim`), and the caches of the previous version are deleted. When changing the cache format, raise `VERSION` in `sw.js`.

## nginx cache headers

| Path | `Cache-Control` |
|---|---|
| `/assets/` | `public, max-age=31536000, immutable` |
| `/sw.js`, `/manifest.webmanifest` | `no-cache` |
| Other screens (`/`, `index.html`, and so on) | `no-cache` |
| `/api/` | As set by the API |

A `location` that has `add_header` does not inherit the server-level `add_header`. So the 2 security headers (`X-Content-Type-Options`, `Referrer-Policy`) are written again in every such `location`. The test (`scripts/test/pwa.test.mjs`) verifies this.

## Icons

| File | Size | Purpose |
|---|---|---|
| `icons/icon-192.png` | 192×192 | manifest `any`, favicon |
| `icons/icon-512.png` | 512×512 | manifest `any`, install screen |
| `icons/maskable-512.png` | 512×512 | manifest `maskable`. Android crops it to a circle or rounded square. Keep the important artwork inside the central circle of 80% diameter |
| `icons/apple-touch-icon.png` | 180×180 | iOS home screen |

- Initially all apps use the same placeholder icon (a white ring on a black background). The scaffold creates it, and for existing apps it is created with `node scripts/pwa-icons.mjs --out <app>/frontend/public` (existing files are not overwritten without `--force`).
- To change an app's icon, replace it with a PNG of the same name and size. Fill the background completely, without transparency (iOS paints transparent areas black).

## Applying it to an app

The scaffold creates all of this for a new app. For an existing app, add the following when applying the design system (#126).

1. Icons: `node scripts/pwa-icons.mjs --out ../<app>/frontend/public`
2. In `<head>` of `frontend/index.html`:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
   <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
   <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
   <link rel="manifest" href="/manifest.webmanifest" />
   <link rel="icon" href="/icons/icon-192.png" type="image/png" />
   <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
   ```
3. At the end of `frontend/src/main.tsx`:
   ```ts
   if (import.meta.env.PROD && 'serviceWorker' in navigator) {
     window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
   }
   ```
   To use `import.meta.env`, `frontend/src/vite-env.d.ts` must contain `/// <reference types="vite/client" />`.

## How to verify

- **Chrome DevTools:** Open the production build (`npm run build -w frontend`, then `docker compose up --build`), and in Application → Manifest check that there are no errors and that the install icon appears in the address bar. The service worker is not registered on the dev server (`vite`).
- **Real device [User]:** On Android Chrome, menu → "Add to Home screen" (or "Install app"); on iOS Safari, Share → "Add to Home Screen". Check that it opens without an address bar when launched from the home screen.
- The install requirement is HTTPS or `localhost`. While running over HTTP without a domain (see the deployment runbook), installation does not work when you connect by server IP. You can verify by opening it through an SSH tunnel (`http://localhost:<web port>`).
