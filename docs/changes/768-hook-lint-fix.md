# #768 follow-up: fix the hook lint error

The first-word rule of #703 made `positional` in `checkNpm` write-only, so the app ESLint (`no-useless-assignment`, 212:5) failed in the sync PRs of all 8 apps. The counter is removed: the loop now returns at the first non-option word, so reaching its end means there was none, and `xargs npm` is reported then.

Behavior is unchanged (`scripts/test/package-install-hook.test.mjs` passes). Checked with a real app's ESLint (life-journal): the old file reports the error at 212:5, the new one is clean. Lesson for the checks: lint changed managed files with an app ESLint before merging (the central `npm run check` has no app ESLint).

Changed: `templates/common/.claude/hooks/block-package-installs.mjs` and its two regenerated copies (`.claude/hooks/`, `plugins/sirloinbh-standards/hooks/`).
