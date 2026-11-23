# #1061 Check relative links and anchors in the docs during npm run check

- Issue: [#1061](https://github.com/sirloinbh/project-standards/issues/1061)
- Branch: `feat/1061-doc-link-check`
- Parent: #1052

## Changes — 2026-11-23

`scripts/check-doc-links.mjs` (Node built-ins only) reads every tracked `*.md` file and checks each relative link: the target file or directory must exist, and a `#anchor` must match a heading in the target (GitHub slug rules, duplicate headings get `-1`, `-2`, ...; `<a name>` and `<a id>` count too). It exits 1 and lists `file:line` for each broken link.

- Ignored: links with a scheme (`https:`, `mailto:`), placeholders (`{{x}}`, `${x}`), links in fenced code, inline code and HTML comments. `.tmpl` files are not Markdown files, so they are never scanned.
- Not scanned: `templates/` and `scaffold/` (links there resolve in the repository that receives the file) and `docs/daily/` (dated notes that also point outside the repository).
- `npm run links:check` runs it; it is part of `check` and `check:docs`. The command table in AGENTS.md lists it.
- Fixed the two broken links it found: the `notify.sh` path in ADR-0021 and the next-steps link in `docs/runbooks/daily.md`.

## Verification

- `node --test scripts/test/check-doc-links.test.mjs`: 9 passed (missing file, missing anchor in the same and another file, directory link, duplicate headings, Korean headings, placeholders, ignored folders and `.tmpl`, exit codes, this repository is clean).
- `npm run check`: see the PR.
