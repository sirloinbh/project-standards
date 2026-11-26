# #1126 Show a pointer cursor on clickable controls

Tailwind v4 gives `button` the arrow cursor, so kit controls felt unclickable.

## Change

`cursor-pointer` added to Button, NativeSelect, Select trigger, Select items (was `cursor-default`), dropdown menu items (was `cursor-default`), SegmentedControl segments, Checkbox and Switch. Button's `disabled:pointer-events-none` became `disabled:cursor-not-allowed` (a native disabled button already ignores clicks; `aria-disabled` keeps `pointer-events-none`).

A shared base rule was not used: utilities such as `cursor-default` override it, and it would need a design-tokens package release.

Tests pin the classes on Button, Switch, Select trigger and NativeSelect. "Pointer cursor" section added to `docs/ui-components.md`.
