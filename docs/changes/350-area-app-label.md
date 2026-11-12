# #350 Add the area/app label for app feature issues

## Change

| File | Content |
|---|---|
| `templates/common/labels.json` | Added the `area/app` label. The sync creates it in target repos |
| `templates/common/skills/std-backlog/SKILL.md` and its copy | Added `app` to the `area/*` list in chapter 3 |

## Decisions

- The name, color (`#bfdadc`), and description are the same as the label first created in sirloinbh/cert-manager.
- The central repo is not a sync target, so the label was created by hand.
