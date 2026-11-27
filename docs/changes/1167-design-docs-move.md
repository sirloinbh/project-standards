# #1167 Move the design-system docs and UI ADRs to design-system

- Issue: #1167 (parent #1155)
- Branch: `docs/1167-design-pointers`
- Companion: sirloinbh/design-system `docs/1167-design-docs`

## Changes — 2026-11-28

- `docs/design-system.md`, `docs/layout.md` and `docs/ui-components.md` are now short pointer pages that link to the copies in design-system. Old links keep working. The 11 screenshots in `docs/ui-components/` moved with them (the pointer pages no longer show them, so they were removed here).
- ADR-0007, ADR-0008, ADR-0011 and ADR-0020 stay in place (accepted ADRs are not rewritten) and gain a "moved to design-system" note in the status line. design-system numbers them ADR-0001 to ADR-0004.
- `docs/korean-text-check.md` points to design-system for the screen-text wording; the check code stays here.
- Not moved: `docs/design-tokens.md` (with the tokens, #1165) and `docs/design.md` (stays, move plan C8).

## Verification

- `npm run check`.
