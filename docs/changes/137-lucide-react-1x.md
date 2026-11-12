# #137 Review the lucide-react 1.x upgrade

## Change

- `docs/adr/0007-shadcn-ui-icons-emoji.md`: changed the pinned `lucide-react` version in the dependency table from 0.468.0 to 1.52.0 (published 2026-10-04).
- `docs/dependency-policy.md`: changed `lucide-react` in the major-version table to 1 / 1.52.0. Noted that the apps' installed version is still 0.468.0.
- `scaffold/app/frontend/package.json.tmpl`: changed `lucide-react` in the new app scaffold to 1.52.0.

## How we decided

- **Changes from 0.x to 1.x (official release notes 1.0.1, lucide.dev/guide/version-1, the React migration guide):**
  - 14 brand icons were removed (Github, Gitlab, Figma, Slack, Facebook, Instagram, LinkedIn, and others).
  - The UMD build was removed. Only ESM and CJS remain.
  - Icons get `aria-hidden` by default. For a meaningful icon, give it an `aria-label` or `title`.
  - `LucideProvider` (sets the default color, size, and stroke width) was added. It is an added feature, so existing code is not affected.
  - The React peer range is `^16.5.1 || ^17 || ^18 || ^19`, and `@types/react` was added as a peer.
- **Icons used in the 8 apps (default branch of each app's `-frontend` repo, 2026-10-22):**
  - workout-memo: `Activity`, `ArrowRight`, `ArrowUpRight`, `Check`, `ChevronLeft`, `ChevronRight`, `Dumbbell`, `LayoutDashboard`, `NotebookPen`, `Plus`, `Settings2`, `Target`, `Trash2`, `X`
  - The other 7 apps: `LayoutDashboard`, `Settings2`
  - Central templates (`templates/ui`, `scaffold`): `CheckIcon`, `ChevronDownIcon`, `ChevronUpIcon`, `CircleIcon`, `HomeIcon`, `InboxIcon`, `Loader2Icon`, `MenuIcon`, `MonitorIcon`, `MoonIcon`, `NotebookPenIcon`, `SunIcon`, `XIcon`, and the type `LucideIcon`
- **Impact in 1.52.0:** None of the icons we use was removed. We do not use brand icons.
  - `Trash2`: `trash-2` was merged into `trash` and became a deprecated alias. The `Trash2` name is still exported and the shape is the same (a trash can with two vertical lines).
  - `HomeIcon`, `Loader2Icon`: these were aliases of `house` and `loader-circle` already in 0.468.0, and they remain aliases in 1.52.0.
- **Version choice:** We chose 1.52.0, the newest published before 2026-10-08. 1.53.0 was published on 2026-10-08 at 06:15 (UTC), which is the cutoff day itself, so we excluded it. With `npm view` we confirmed 0 dependencies, no install scripts (`preinstall`, `install`, `postinstall`, `prepare`), and the ISC license.

## Verification

- Only the documents and the version string in the scaffold template changed. No package was installed.
- `npm run check` passed (exit code 0).
