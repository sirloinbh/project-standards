# #228 Fix the secret scanning commands in the repo settings doc

The secret scanning and push protection commands in `docs/repo-settings.md` piped JSON into `ghp api ... --input -`. The wrapper `gh-project.ps1` does not accept pipeline input, so they failed with `InputObjectNotBound` and HTTP 400 (the user ran them on 2026-10-26).

## Change

| File | Content |
|---|---|
| `docs/repo-settings.md` | Changed the commands to write the JSON to a temporary file, pass it with `--input <file>`, and then delete it |

## Verification

- `npm run check`: passed
