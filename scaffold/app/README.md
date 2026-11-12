# {{project.displayName}}

{{project.summary}}

## Development baseline

Node.js **{{versions.node}}**, npm **{{versions.npm}}**. The common rules come from the central repo [sirloinbh/project-standards](https://github.com/sirloinbh/project-standards), and the centrally managed files in this repo change only through sync PRs.

| Command | What it does |
|---|---|
| `npm ci` | Install dependencies (`.npmrc` blocks install scripts) |
| `npm run check` | Format, lint, contract copy, skill copy, types, tests, build |
| `npm run standards:check` | Check the centrally managed files and the registry values |
| `npm run lockfiles:sync` | After changing dependencies, align the `frontend/` and `backend/` lockfiles to the root lockfile versions (no install) |
| `npm run test:e2e` | Playwright browser checks (needs a test DB) |
| `npm run db:migrate` | Apply DB migrations |
| `npm run openapi` | Regenerate `docs/openapi.json` after changing the API |

## Run

```powershell
Copy-Item .env.example .env   # change the password, then run
docker compose up --build -d
```

Open http://localhost:{{project.ports.web}} . Data is stored in the `{{project.db.name}}-data` volume. `docker compose down -v` deletes the data.

## Ports (central registry slot {{project.slot}})

| Use | Port |
|---|---|
| Web (Docker) | {{project.ports.web}} |
| API | {{project.ports.api}} |
| Vite dev server | {{project.ports.vite}} |
| DB (host) | {{project.ports.db}} |
| e2e API / web | {{project.ports.e2eApi}} / {{project.ports.e2eWeb}} |

## Repo layout

The umbrella repo `{{project.repos.umbrella}}` is the source, and `frontend/`, `backend/`, and `database/` go out as subtrees to `{{project.repos.frontend}}`, `{{project.repos.backend}}`, and `{{project.repos.db}}` (`scripts/push-repositories.ps1`).

## Docs

- [Agent instructions](AGENTS.md), [Project-specific instructions](AGENTS.project.md)
- [Deployment and operations](docs/deployment.md), [Backup and restore](docs/backup-restore.md)
- [Daily log](docs/daily/README.md), [Next steps](docs/next-steps/README.md)
- [DB migrations](database/README.md)
