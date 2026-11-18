# #668 Derive the sign-in origin from the known root domain

## Change

- `templates/ui/frontend/src/lib/auth-config.ts.tmpl` (new): `ROOT_DOMAIN`, rendered from `registry/platform.json` `rootDomain`.
- `templates/ui/frontend/src/auth-origin.ts`: `authOrigin(location, rootDomain)` returns `https://auth.<root domain>` only for hosts under the root domain, and null for everything else. Before, it dropped the first host label, so `daysofme.com` gave `auth.com` and `app.pages.dev` gave `auth.pages.dev`, each receiving the return URL.
- `templates/ui/frontend/src/sign-in.tsx`: passes `ROOT_DOMAIN`.
- `templates/app/.prettierignore.tmpl`: lists the new rendered file.
- Tests: apex, `*.pages.dev`, `co.kr`, look-alike (`evil-daysofme.com`), suffix trick (`<app>.daysofme.com.evil.net`) and an empty root domain return null (`auth-origin.test.ts` and the central `frontend-auth-origin.test.mjs`).
- The apex host gets no sign-in: the shared sign-in is served at `auth.<root>` and apps live on subdomains.
- `platform.rootDomain` must be set; a null value makes the sync fail loudly (the renderer rejects null variables) instead of rendering a wrong domain.

## Verification

- `npm run check`: see the PR.
