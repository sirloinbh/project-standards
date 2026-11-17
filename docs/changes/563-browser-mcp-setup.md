# #563 Browser MCP setup for coding agents

Adds a "Browser MCP tools for coding agents" section to [docs/tools.md](../tools.md). The install is a user step, so #563 stays open (`Refs #563`).

## Decisions

| Item | Decision | Reason |
|---|---|---|
| Default tool | Chrome DevTools MCP `chrome-devtools-mcp@1.12.0` | Gives agents console, network, and performance data (#563 recommendation) |
| Flow replay | Playwright MCP `@playwright/mcp@0.0.84` | Same engine as workout-memo's Playwright tests |
| Versions | Newest at least 14 days old on 2026-11-18; 1.13.0 and 0.0.85 are too young | Dependency policy |
| Scope | User scope, `cmd /c npx` on Windows | Not app-specific; nothing to sync into 8 repos; no project approval prompts |
| Profile | Always `--isolated`; never the everyday Chrome profile | Both tools expose page data, cookies, and storage to the agent |
| Signed-in apps | Dedicated test account; Playwright `--storage-state`; wait for #542 | An empty profile cannot pass the shared sign-in |
| ego lite (#575) | Mentioned only: macOS only | Not usable on this Windows PC |

## Checked

- `npm view` for both packages: license Apache-2.0, official repos, published by GitHub Actions, no install scripts. `chrome-devtools-mcp` has a `prepare` script in its manifest, which npm does not run for registry installs.
- Flags come from the official READMEs. The agent cannot run `npx`, so the commands were not run here; the user's `/mcp` check in the setup confirms them (including `cmd /c` on Windows).

## Remaining user steps

1. Confirm `npx` may run for these two packages.
2. Run the two `claude mcp add --scope user ...` commands from the docs and check `/mcp`.
