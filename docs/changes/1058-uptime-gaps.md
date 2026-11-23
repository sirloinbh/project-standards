# #1058 Decide how to close the gaps in app uptime checks

- Issue: [#1058](https://github.com/sirloinbh/project-standards/issues/1058), epic #1051
- Branch: `docs/1058-uptime-gaps`

## Changes — 2026-11-23

- New `docs/research/uptime-gaps.md`: what monitoring exists, four gaps, targets from the registry, five options compared, and the recommendation (one server timer probing the public URLs through the proxy, one new healthchecks.io check, issues opened and closed by the script with a token in SSM).
- Implementation issues registered under #1051: #1076 (probe script) and #1077 (open and close issues, needs the user). The recommendation waits for the user's confirmation.

## Verification

- `npm run check:docs`
