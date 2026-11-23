# #1045 Close two bypasses of the forbidden-command guard hook

- Issue: [#1045](https://github.com/sirloinbh/project-standards/issues/1045)
- Branch: `fix/1045-guard-bypasses`
- Date: 2026-11-23 (Asia/Seoul)

## Problem

`findForbiddenCommand` returned `null` for `env -u FOO git push -f origin x` and `sudo -u bob git push origin main` (the option's value was taken as the program), and for `ghp pr merge 5 -md` (`-d` inside combined short flags).

## Change

- `templates/common/.claude/hooks/block-forbidden-commands.mjs`: after a prefix program (`env`, `sudo`, ...) the next three words are each tried as the command start; `checkMerge` matches `-d` inside combined short flags. Copy: `.claude/hooks/` (`npm run self`).
- `scripts/test/forbidden-command-hook.test.mjs`: the four commands are blocked; `env -u FOO git status`, `sudo -u bob ls -la` and a plain `-m` merge still pass.

## Checks

- `node --test scripts/test/forbidden-command-hook.test.mjs`: pass.
- `npm run check` (Git Bash, Windows): pass. The changed hook also passes `npm run lint` and `typecheck` in a clean workout-memo clone.
