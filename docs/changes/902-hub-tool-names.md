# #902 Hub tool names use underscores

## Change

| File | Content |
|---|---|
| `docs/conventions/first-ai-tool.md` | Steps 2 and 3 say the app part of a hub tool name has underscores (`money_ledger__list_entries`), and that the hyphenated name fails with "Tool … not found" |

## Why

The #711 live check for money-ledger and cert-manager called `money-ledger__list_entries`, which the hub does not know; `tools/list` showed `money_ledger__list_entries`.

## Checks

- `npm run check:docs`: see the PR.
