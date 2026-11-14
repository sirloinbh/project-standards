# #435 file-control local UI port: slot 09, web 8109

## Background

`sirloinbh/file-control` (the `fctl` CLI) gets a local screen, `fctl ui`, served on `127.0.0.1` (file-control#250, #251). It needs a port that never collides with the apps' local ports. The registry schema only described full apps (4 repos, 6 ports, DB, deploy), and file-control has none of those.

## Decision

Option 2 of the issue: a separate `localTools` list in `registry/projects.json`, instead of a fake app entry.

- A local tool shares the slot sequence with apps, so the next app gets slot 10, not 09.
- It lists only the ports it uses. Each one still follows the ADR-0006 formula and stays clear of reserved ports.
- It is not part of `projects`, so sync, compliance, scaffold, and deploy never see it.

## Change

- `registry/projects.schema.json`: optional `localTools` (slot, name, repo, summary, ports).
- `registry/projects.json`: `file-control`, slot 9, `web: 8109`.
- `scripts/lib/registry.mjs`: slot, name, and port duplicate checks cover apps and local tools together; the formula and reserved-port checks cover only listed ports; a local tool needs at least one port.
- `scripts/gen-docs.mjs`, `docs/projects.md`: a "Local tools" table.
- `docs/adr/0006-port-slot-allocation.md`: one line about local tools.

## Verification

- `node --test scripts/test/registry.test.mjs`: 16 passed (2 new).
- `npm run check` (Git Bash): see the PR.

## Follow-up

- file-control#251 keeps 8109 as the default of `fctl ui` (the assigned value matches the request).
