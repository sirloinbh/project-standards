# #50 Template renderer and managed file hash (manifest)

## Change

| File | Content |
|---|---|
| `scripts/lib/render.mjs` | `{{variable}}` substitution (an undefined variable fails), inserting a managed header per file type, and preserving the project section below `# --- project ---` |
| `scripts/lib/hash.mjs` | SHA-256 that ignores line endings (CRLF/LF) and BOM, section extraction, field extraction, and JSON comparison independent of key order |
| `scripts/lib/manifest.mjs` | Generates `.standards/manifest.json` and compares files in target repos. There are three management modes: full, section, and fields |
| `scripts/test/render.test.mjs`, `manifest.test.mjs` | 16 tests |

## Rules decided

- **Preserve GitHub Actions expressions:** `{{ }}` that comes right after `$`, as in `${{ github.sha }}`, is not treated as a template variable. This keeps GitHub Actions expressions in workflow templates from breaking.
- **Header position:** the first line by default. The following lines must stay at the very top, so the header goes right below them: the shebang (`#!`), the Dockerfile parser directive (`# syntax=`), and Markdown frontmatter.
- **When no header is added:** formats that cannot have comments (JSON, `.nvmrc`, `.node-version`), or files that already have a header.
- **Line endings:** rendering uses LF. The `.gitattributes` of the target repo decides line endings at checkout (`*.ps1` is CRLF).
- **Section-managed files:** the template must end with a `# --- project ---` line. If the target repo has no marker line, the project section starts empty.

## Checks

- `npm run check`: 40 tests passed (24 existing + 16 new), `registry-check: ok`, `docs/projects.md: up to date`
