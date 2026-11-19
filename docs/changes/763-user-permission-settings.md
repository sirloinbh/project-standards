# #763 Record the user-level permission settings and delete guard

`docs/model-selection.md`, section "Other user-level settings on this PC", now describes the trimmed `permissions.ask` list, the `guard-deletes.mjs` PreToolUse hook (what it asks for, what it auto-approves, where it lives), and that `~/.claude/settings.json` and the Orca profile `settings.json` must stay in sync. Source: the hook file and the settings files as of 2026-11-19. Docs only.

Check: `npm run check:docs`.

Follow-up (coordinator correction, same day): the setup is in four user-level files, not two: `~/.claude/settings.json` and `home\settings.json` in each of the three Orca account profiles. The doc now says a permission change must go to every one of them.
