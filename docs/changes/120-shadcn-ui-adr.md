# #120 Settle on shadcn/ui for UI components and choose the icon and emoji sources

## Change

- `docs/adr/0007-shadcn-ui-icons-emoji.md`: adoption of shadcn/ui and writing the source directly, lucide-react, Fluent Emoji Flat, a table of pinned dependency versions, and rules for using icons and emoji

## How we decided

- **UI components:** The user chose shadcn/ui without a comparison.
- **Emoji:** We compared 4 candidates and asked the user, who chose Fluent Emoji Flat.

  | Candidate | License | SVG | Note |
  |---|---|---|---|
  | Fluent Emoji Flat | MIT (checked with the GitHub API) | Yes | Chosen |
  | Noto Emoji | Images Apache-2.0, font OFL-1.1 | Yes | |
  | Twemoji (jdecked fork) | Graphics CC-BY 4.0, code MIT | Yes | Needs attribution |
  | Tossface | Could not confirm the official terms | Mostly a font | |

- **Dependency versions:** We used `npm view` (read-only) to look up version, publish date, license, repository, and whether there is an install script. We chose the newest version published before 2026-10-08.
- **lucide-react:** The latest is 1.61.0, but the apps use 0.468.0. It is a major upgrade, so we keep the current version and registered the upgrade review as a separate issue.

## Verification

- Only documents changed. `npm run check` passed.
- Confirmed with `npm view <package>@<version> scripts` that none of the packages in the ADR has an install script.
