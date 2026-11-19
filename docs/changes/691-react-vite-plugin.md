# #691 Add the React Vite plugin for Fast Refresh

Every app's `vite.config.ts` now loads `@vitejs/plugin-react`, so editing a component keeps its state through Fast Refresh (`eslint-plugin-react-refresh` was already installed, but nothing provided Fast Refresh).

The user approved the package on 2026-11-19 (relayed by the coordinator).

## Change

| File | Content |
|---|---|
| `versions.json` | `dependencies.frontend.devDependencies`: `@vitejs/plugin-react` 5.2.0. It becomes a managed field of every app's `frontend/package.json` |
| `templates/app/frontend/vite.config.ts.tmpl` | `import react from '@vitejs/plugin-react'` and `plugins: [react(), tailwindcss()]` |
| `scaffold/app/frontend/package.json.tmpl` | The same devDependency for new apps |
| `docs/versions.md` | Regenerated (`npm run docs`) |

## Package investigation (docs/dependency-policy.md, procedure steps 2-4)

| Check | Result |
|---|---|
| Version | **5.2.0**, exact. The newest 6.x versions need `vite ^8`; the apps use vite 6.4.5, and 5.2.0 accepts `^4.2 \|\| ^5 \|\| ^6 \|\| ^7 \|\| ^8` |
| Released | 2026-03-12, far past the 14 days |
| License, publisher, repository | MIT; maintainers `yyx990803` and `vitebot`; `github.com/vitejs/vite-plugin-react` |
| Install scripts | None (`prepublishOnly` only, which npm does not run on install) |
| Provenance | SLSA provenance attestation is published for 5.2.0 |
| Dependencies it brings | `@babel/core`, `react-refresh`, `@babel/plugin-transform-react-jsx-self`, `@babel/plugin-transform-react-jsx-source`, `@rolldown/pluginutils` and `@types/babel__core`: this is the largest part of the supply-chain surface (Babel) |
| Node | `^20.19 \|\| >=22.12`; the repo uses Node 24 |

## For the apps

The sync PR adds a devDependency, so each app's lockfiles need updating: add a commit to the sync PR with `npm install --ignore-scripts --save-exact` (root) and `npm run lockfiles:sync`, and do not start its message with `chore: sync central standards (project-standards@`. Run `ioc-scan` and record the result in the PR (procedure step 6).
