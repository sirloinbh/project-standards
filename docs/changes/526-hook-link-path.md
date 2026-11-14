# #526 Guard hooks did nothing through a link path

- Issue: [#526](https://github.com/sirloinbh/project-standards/issues/526)
- Branch: `fix/526-hook-link-path`
- Date: 2026-11-14 (Asia/Seoul)

## Problem

While checking #516, a headless Claude Code session in file-control ran `npm install left-pad --dry-run` and the plugin's `block-package-installs.mjs` hook let it through (status 0), although the debug log showed the hook ran. Orca's Claude profile folder `...\orca\claude-profiles\<id>\home\plugins` is a junction to `C:\Users\kimbh\.claude\plugins`, so `${CLAUDE_PLUGIN_ROOT}` is a link path. Both guard hooks ran `main()` only when `path.resolve(process.argv[1])` equalled `fileURLToPath(import.meta.url)`. Node loads the main module from its real path, so the two differed and the hook exited 0 without reading the event. The same happens for `${CLAUDE_PROJECT_DIR}/.claude/hooks/...` when a repo is opened through a link.

## Change

- `templates/common/.claude/hooks/block-package-installs.mjs`: new exported `isMainModule(argv1, moduleUrl)` compares real paths (`fs.realpathSync`, case-insensitive) and is used for the entry check.
- `templates/common/.claude/hooks/block-forbidden-commands.mjs`: uses the same helper (drops its unused `fileURLToPath` import).
- Copies: `.claude/hooks/` and `plugins/sirloinbh-standards/hooks/` (`npm run plugin`).
- `scripts/test/package-install-hook.test.mjs`: runs both hooks through a junction (Windows) or symlink and expects exit 2 for `npm install` and `git push --force`, and exit 0 for `npm run check`.

Other scripts with the same entry check (`scripts/*.mjs`, `tools/*.mjs`) are left as they are: when they skip, nothing runs and the user sees it, while a skipped guard hook silently allows the command.

## Checks

- Before: `node <junction path>/hooks/block-package-installs.mjs` with an `npm install left-pad` event → exit 0. After: exit 2.
- `node --test scripts/test/package-install-hook.test.mjs`: 9 passed.
- `npm run check` (Git Bash): pass (546 passed, 0 failed, 5 skipped).
