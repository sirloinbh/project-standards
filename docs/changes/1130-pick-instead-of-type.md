# #1130 Prefer picking values over typing them

User requirement (2026-11-26): input should be chosen from a list wherever possible.

## Change

| File | Change |
|---|---|
| `docs/ui-components.md` | New section "Pick a value instead of typing it": which control for which shape of values (SegmentedControl, NativeSelect/Select, Combobox, date/time input, NumberInput, Checkbox/Switch) and when free text stays |
| `templates/app/skills/std-ux-audit/SKILL.md` | Row "Typed instead of picked" lists free-text inputs whose values come from a known set |

## Tracking

The issue stays open until the eight app cards are closed (listed in #1130). The PR only references it.
